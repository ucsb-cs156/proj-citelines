# BibTex information

Info on BibTex format: https://www.bibtex.com/g/bibtex-format/

## Converting between BibTex as a string, and a MongoDB Document

Since you are already set up with MongoDB, this approach will be incredibly clean. The best tool for this job remains JBibTeX because its underlying data structures map perfectly to a standard Java Map<String, String>, which Spring Data MongoDB serializes directly into a BSON document.
Here is the most efficient approach to handle the two-way translation (Raw String ⇄ MongoDB Object) seamlessly in your Spring Boot application.

## 1. The MongoDB Document Design
Define a document where the flexible attributes are stored in a nested Map. Ensure you force the map keys to lowercase during parsing to guarantee that fields like doi or DOI are stored consistently. [1, 2] 

import org.springframework.data.annotation.Id;import org.springframework.data.mongodb.core.index.Indexed;import org.springframework.data.mongodb.core.mapping.Document;import java.util.Map;

@Document(collection = "bib_entries")public class BibEntryDocument {

    @Id 
    private String id;
    
    private String entryType;   // e.g., "article", "book"
    private String citationKey; // e.g., "smith2023"

    // Index the specific nested field for performance
    @Indexed
    private Map<String, String> fields; 

    // Constructors, Getters, and Setters
    public BibEntryDocument() {}

    public BibEntryDocument(String entryType, String citationKey, Map<String, String> fields) {
        this.entryType = entryType;
        this.citationKey = citationKey;
        this.fields = fields;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getEntryType() { return entryType; }
    public void setEntryType(String entryType) { this.entryType = entryType; }
    public String getCitationKey() { return citationKey; }
    public void setCitationKey(String citationKey) { this.citationKey = citationKey; }
    public Map<String, String> getFields() { return fields; }
    public void setFields(Map<String, String> fields) { this.fields = fields; }
}

------------------------------
## 2. The Conversion Utility (String ⇄ Object)
Create a dedicated service or utility component. This isolates the JBibTeX library classes (BibTeXDatabase, Key, Value) from your core business logic, converting them strictly to clean Java standard collections.

```java

import org.jbibtex.*;
import org.springframework.stereotype.Service;
import java.io.StringReader;
import java.io.StringWriter;
import java.util.*;

@Servicepublic class BibTexConverterService {

    /**
     * Converts a raw BibTeX String into a list of MongoDB-ready Documents.
     */
    public List<BibEntryDocument> parseStringToDocuments(String rawBibTex) throws Exception {
        BibTeXParser parser = new BibTeXParser();
        BibTeXDatabase database = parser.parse(new StringReader(rawBibTex));
        Map<Key, BibTeXEntry> entries = database.getEntries();
        
        List<BibEntryDocument> documents = new ArrayList<>();

        for (Map.Entry<Key, BibTeXEntry> entry : entries.entrySet()) {
            String citationKey = entry.getKey().getValue();
            BibTeXEntry bibEntry = entry.getValue();
            String entryType = bibEntry.getType().getValue().toLowerCase();

            // Flatten JBibTeX's custom Map into a simple Map<String, String>
            Map<String, String> stringFields = new HashMap<>();
            for (Map.Entry<Key, Value> field : bibEntry.getFields().entrySet()) {
                String keyName = field.getKey().getValue().toLowerCase(); // Enforce lowercase keys
                String valueStr = field.getValue().toValueString();
                stringFields.put(keyName, valueStr);
            }

            documents.add(new BibEntryDocument(entryType, citationKey, stringFields));
        }
        return documents;
    }

    /**
     * Converts a MongoDB Document back into a formatted BibTeX String.
     */
    public String convertDocumentToBibTexString(BibEntryDocument doc) throws Exception {
        BibTeXDatabase database = new BibTeXDatabase();
        
        // Reconstruct the JBibTeX model structures
        Key entryTypeKey = new Key(doc.getEntryType());
        Key citationKeyObj = new Key(doc.getCitationKey());
        
        BibTeXEntry bibEntry = new BibTeXEntry(entryTypeKey, citationKeyObj);
        
        // Re-populate fields
        for (Map.Entry<String, String> field : doc.getFields().entrySet()) {
            Key fieldKey = new Key(field.getKey());
            // StringValue handles appropriate escaping/quoting rules dynamically 
            Value fieldValue = new StringValue(field.getValue(), StringValue.Style.QUOTED); 
            bibEntry.addField(fieldKey, fieldValue);
        }
        
        database.addObject(bibEntry);

        // Format and print back to pure text
        StringWriter writer = new StringWriter();
        BibTeXFormatter formatter = new BibTeXFormatter();
        formatter.format(database, writer);
        
        return writer.toString();
    }
}
```

------------------------------
## 3. The Repository Layer

Your Spring Data interface requires no boilerplate queries. It natively checks your runtime MongoDB maps using standard method names:

```java
import org.springframework.data.mongodb.repository.MongoRepository;import java.util.Optional;
public interface BibEntryRepository extends MongoRepository<BibEntryDocument, String> {
    
    // Traverses into the "fields" map automatically looking for the 'doi' key
    Optional<BibEntryDocument> findByFieldsDoi(String doi);
}
```

------------------------------

## Why this is a great choice for your use case:

1. No Data Mismatch Exceptions: If an entry contains non-standard fields like abstract, eprint, or custom_field_xyz, MongoDB accepts it unconditionally. There are no relational schema limits to worry about. [3, 4] 
2. True Round-Tripping: The StringValue.Style.QUOTED handling inside the BibTeXFormatter guarantees that when they export data back out, it retains syntactically valid BibTeX double quotes (author = "Smith, J.") automatically.
3. No Docker Requirement: Using the Flapdoodle embedded dependency, this entire layout launches smoothly inside their local IDEs instantly. [5] 

If you'd like, tell me:

* Do you want an example of how to strip or format LaTeX special characters (like {\&} or {\"o}) that JBibTeX might pull straight into the map string?
* Would it be helpful to see a sample Spring Boot REST Controller integration showcasing this conversion service?


[1] [https://www.tessell.com](https://www.tessell.com/blog/what-is-mongodb)
[2] [https://medium.com](https://medium.com/@agrim.kandoria/evaluating-data-archiving-solutions-for-historical-data-from-mongodb-dfce40266f63)
[3] [https://www.youtube.com](https://www.youtube.com/watch?v=BVPP8etiHVs)
[4] [https://joynwaiwu.hashnode.dev](https://joynwaiwu.hashnode.dev/getting-started-with-database-mongodb)
[5] [https://www.youtube.com](https://www.youtube.com/watch?v=222MwmHkjrw)

Here is the complete implementation for cleaning up LaTeX formatting and exposing these transformations via a Spring Boot REST API.
------------------------------

## 1. Handling LaTeX Characters with JBibTeX

By default, JBibTeX extracts literal text fields exactly as they are written in the .bib file. This means names like Schr{\"{o}}der or symbols like {\&} are pulled into the database with their raw LaTeX syntax intact.
To clean this data up before saving it to MongoDB, you can use JBibTeX's built-in LaTeXParser and LaTeXPrinter. This subsystem converts LaTeX macro tokens into readable, universally compliant Unicode strings.
Update your BibTexConverterService to integrate this parsing step and expose the REST endpoints:

```java
import org.jbibtex.*;
import org.springframework.stereotype.Service;
import java.io.StringReader;
import java.io.StringWriter;
import java.util.*;

@Servicepublic class BibTexConverterService {

    /**
     * Converts raw BibTeX to list of MongoDB documents, converting LaTeX macros to plain Unicode.
     */
    public List<BibEntryDocument> parseStringToDocuments(String rawBibTex) throws Exception {
        BibTeXParser parser = new BibTeXParser();
        BibTeXDatabase database = parser.parse(new StringReader(rawBibTex));
        Map<Key, BibTeXEntry> entries = database.getEntries();
        
        List<BibEntryDocument> documents = new ArrayList<>();

        for (Map.Entry<Key, BibTeXEntry> entry : entries.entrySet()) {
            String citationKey = entry.getKey().getValue();
            BibTeXEntry bibEntry = entry.getValue();
            String entryType = bibEntry.getType().getValue().toLowerCase();

            Map<String, String> stringFields = new HashMap<>();
            for (Map.Entry<Key, Value> field : bibEntry.getFields().entrySet()) {
                String keyName = field.getKey().getValue().toLowerCase();
                String rawValue = field.getValue().toValueString();
                
                // Convert LaTeX commands (like {\"o} or {\&}) to standard Unicode
                String cleanValue = cleanLatexStrings(rawValue);
                stringFields.put(keyName, cleanValue);
            }

            documents.add(new BibEntryDocument(entryType, citationKey, stringFields));
        }
        return documents;
    }

    /**
     * Converts a MongoDB Document back into a formatted BibTeX String.
     */
    public String convertDocumentToBibTexString(BibEntryDocument doc) throws Exception {
        BibTeXDatabase database = new BibTeXDatabase();
        
        Key entryTypeKey = new Key(doc.getEntryType());
        Key citationKeyObj = new Key(doc.getCitationKey());
        BibTeXEntry bibEntry = new BibTeXEntry(entryTypeKey, citationKeyObj);
        
        for (Map.Entry<String, String> field : doc.getFields().entrySet()) {
            Key fieldKey = new Key(field.getKey());
            // Style.QUOTED ensures output wraps values beautifully: author = "Smith, J."
            Value fieldValue = new StringValue(field.getValue(), StringValue.Style.QUOTED); 
            bibEntry.addField(fieldKey, fieldValue);
        }
        
        database.addObject(bibEntry);

        StringWriter writer = new StringWriter();
        BibTeXFormatter formatter = new BibTeXFormatter();
        formatter.format(database, writer);
        
        return writer.toString();
    }

    /**
     * Helper logic utilizing JBibTeX internals to clean up LaTeX tokens.
     */
    private String cleanLatexStrings(String rawValue) {
        try {
            LaTeXParser latexParser = new LaTeXParser();
            List<LaTeXObject> objects = latexParser.parse(rawValue);
            
            LaTeXPrinter latexPrinter = new LaTeXPrinter();
            return latexPrinter.print(objects);
        } catch (Exception e) {
            // Fallback gracefully to raw values if the LaTeX string has broken syntax
            return rawValue;
        }
    }
}
```

------------------------------
## 2. The Spring Boot REST Controller
This controller exposes the endpoints to handle importing raw text strings, querying stored objects via the nested doi key, and exporting a single database entity back to standard BibTeX format.

```java

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/bibtex")
@CrossOrigin(origins = "*") // Helpful for student frontend cross-origin testingpublic class BibTexController {

    private final BibEntryRepository repository;
    private final BibTexConverterService converterService;

    public BibTexController(BibEntryRepository repository, BibTexConverterService converterService) {
        this.repository = repository;
        this.converterService = converterService;
    }

    /**
     * Endpoint 1: Receive pasted raw BibTeX from frontend, parse, clean, and save to Mongo.
     */
    @PostMapping("/import")
    public ResponseEntity<?> importBibTex(@RequestBody String rawBibTex) {
        if (rawBibTex == null || rawBibTex.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("BibTeX content cannot be empty.");
        }
        
        try {
            List<BibEntryDocument> parsedDocs = converterService.parseStringToDocuments(rawBibTex);
            List<BibEntryDocument> savedDocs = repository.saveAll(parsedDocs);
            return ResponseEntity.status(HttpStatus.CREATED).body(savedDocs);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                    .body("Failed to parse BibTeX string: " + e.getMessage());
        }
    }

    /**
     * Endpoint 2: Retrieve a specific structured object using the DOI key path.
     */
    @GetMapping("/search")
    public ResponseEntity<BibEntryDocument> getByDoi(@RequestParam String doi) {
        return repository.findByFieldsDoi(doi.trim().toLowerCase())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Endpoint 3: Convert an existing database record back to raw BibTeX format.
     */
    @GetMapping("/{id}/export")
    public ResponseEntity<String> exportToBibTexString(@PathVariable String id) {
        return repository.findById(id)
                .map(doc -> {
                    try {
                        String rawBibTex = converterService.convertDocumentToBibTexString(doc);
                        return ResponseEntity.ok()
                                .header("Content-Type", "text/plain; charset=UTF-8")
                                .body(rawBibTex);
                    } catch (Exception e) {
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                .body("Export processing failed.");
                    }
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
```

------------------------------
## What this looks like in practice 

If you use a frontend interface to submit this string:

```
@article{Schroder2026,
  author = {Schr{\"{o}}der, Max and Smith, J{\&}K},
  title = {A Study on Clean Schemas},
  doi = {10.1001/css.2026.01}
}
```


1. The DB Save Result: The JSON object stored in MongoDB will have LaTeX symbols normalized into readable text strings inside the collection document:

```
   {
     "id": "65cb76f1e8e2b8214d0...",
     "entryType": "article",
     "citationKey": "Schroder2026",
     "fields": {
       "author": "Schröder, Max and Smith, J&K",
       "title": "A Study on Clean Schemas",
       "doi": "10.1001/css.2026.01"
     }
   }
```
   
2. The DOI query: Accessing `/api/bibtex/search?doi=10.1001/css.2026.01` instantly indexes and returns that payload directly.



## Custom Validation and Error Handling in Spring Boot

When an invalid BibTeX input string arrives (e.g., a missing closing curly brace or syntax syntax anomalies), JBibTeX throws instances of org.jbibtex.ParseException or TokenMgrException.
Instead of letting the application crash with a default stack trace page, implementing a global @RestControllerAdvice translates syntax tracking into structured JSON schemas for student feedback.

## A. Structured Error Response Payload

```java
import java.time.LocalDateTime;
public class ErrorDetails {
    private LocalDateTime timestamp;
    private String message;
    private String details;

    public ErrorDetails(String message, String details) {
        this.timestamp = LocalDateTime.now();
        this.message = message;
        this.details = details;
    }

    // Getters and Setters
    public LocalDateTime getTimestamp() { return timestamp; }
    public String getMessage() { return message; }
    public String getDetails() { return details; }
}
```

## B. Global Rest Controller Exception Advice

```
import org.jbibtex.ParseException;import org.jbibtex.TokenMgrError;import org.springframework.http.HttpStatus;import org.springframework.http.ResponseEntity;import org.springframework.web.bind.annotation.RestControllerAdvice;import org.springframework.web.bind.annotation.ExceptionHandler;import org.springframework.web.context.request.WebRequest;

@RestControllerAdvicepublic class GlobalBibTexExceptionHandler {

    /**
     * Trap explicit JBibTeX logical schema exceptions (e.g. malformed keywords).
     */
    @ExceptionHandler(ParseException.class)
    public ResponseEntity<ErrorDetails> handleBibTexParseException(ParseException ex, WebRequest request) {
        ErrorDetails errorDetails = new ErrorDetails(
            "Syntax validation error in your BibTeX text layout.",
            ex.getMessage() // This contains specific line numbers/token errors computed by JBibTeX
        );
        return new ResponseEntity<>(errorDetails, HttpStatus.UNPROCESSABLE_ENTITY);
    }

    /**
     * Trap low-level tokenization loop crashes (e.g., unclosed curly brackets).
     */
    @ExceptionHandler(TokenMgrError.class)
    public ResponseEntity<ErrorDetails> handleBibTexTokenError(TokenMgrError ex, WebRequest request) {
        ErrorDetails errorDetails = new ErrorDetails(
            "Fatal syntax configuration error. Please confirm all symbols, brackets, and quotes match.",
            ex.getMessage()
        );
        return new ResponseEntity<>(errorDetails, HttpStatus.BAD_REQUEST);
    }

    /**
     * Standard runtime protection catch-all.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorDetails> handleGlobalException(Exception ex, WebRequest request) {
        ErrorDetails errorDetails = new ErrorDetails(
            "An unexpected processing error occurred.",
            ex.getLocalizedMessage()
        );
        return new ResponseEntity<>(errorDetails, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
```

------------------------------
## What happens when students paste broken data

If a student pastes a malformed entry missing a brace:

```
@article{brokenEntry,
  author = {Smith, John},
  title = {Missing ending loop element

```

   1. The Backend intercept: JBibTeX triggers a TokenMgrError during processing.
   2. The Response Output: The @RestControllerAdvice intercepts it and constructs a clean JSON body payload:
   
   {
     "timestamp": "2026-08-08T17:52:10.123456",
     "message": "Fatal syntax configuration error. Please confirm all symbols, brackets, and quotes match.",
     "details": "Lexical error at line 4, column 41. Encountered: <EOF> after..."
   }
   
   3. The Frontend Action: The JavaScript code automatically catches the failure status, reads data.message, and projects it into the #errorBox layer for direct troubleshooting assistance.




