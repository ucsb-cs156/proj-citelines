# Markdown Design Considerations

For an application built *by* programmers *for* programmers, **Markdown is absolutely the right choice.** Programmers generally prefer Markdown because it keeps their hands on the keyboard, avoids the clunkiness of traditional WYSIWYG toolbars, and natively supports code blocks.

Here is a recommended, highly mature, open-source stack for both your React frontend and Spring Boot backend that handles Markdown rendering and syntax highlighting seamlessly.

---

## ⚛️ Frontend Stack (React)

To render Markdown and handle syntax highlighting in React, the gold standard is combining `react-markdown` with `react-syntax-highlighter`.

### 1. Rendering Markdown: `react-markdown`

* **What it is:** A highly secure, robust Markdown component for React that uses a syntax tree (`remark`) instead of blindly setting `dangerouslySetInnerHTML`.
* **Why use it:** It's the most widely adopted and actively maintained Markdown library in the React ecosystem.
* **License:** MIT (Free & Open Source)

### 2. Syntax Highlighting: `react-syntax-highlighter`

* **What it is:** A component that wraps `prismjs` or `highlight.js` to provide syntax highlighting for virtually any programming language, including Python, C, C++, Java, and JavaScript.
* **Why use it:** It plugs directly into `react-markdown` as a custom renderer for `<code>` blocks.
* **License:** MIT

### 💻 How it looks in code:

```javascript
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const MarkdownCard = ({ content }) => {
  return (
    <div className="card">
      <ReactMarkdown
        children={content}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                children={String(children).replace(/\n$/, '')}
                style={vscDarkPlus} // VS Code dark theme
                language={match[1]}
                PreTag="div"
                {...props}
              />
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          }
        }}
      />
    </div>
  );
};

```

---

## 🍃 Backend Stack (Spring Boot)

On the backend, your main responsibilities are **parsing/validating** Markdown (if you need to do server-side processing) and **HTML sanitization** (crucial to prevent XSS attacks if users can write raw HTML inside Markdown).

### 1. Parsing Markdown: `flexmark-java` or `commonmark-java`

* **Recommendation:** **`commonmark-java`** (by Atlassian) is the most stable and strictly adheres to the CommonMark spec. If you need heavy extensions (like GitHub Flavored Markdown tables or task lists), **`flexmark-java`** is the powerhouse, though it has a slightly steeper learning curve.
* **Why use it:** Both allow you to parse Markdown into HTML on the backend if you ever need to generate emails, PDFs, or pre-render content for SEO.
* **License:** BSD / Apache 2.0

### 2. Security: `owasp-java-html-sanitizer`

* **What it is:** A fast, highly configurable HTML sanitizer.
* **Why you need it:** Even if you use a Markdown parser, a clever user could write `<script>maliciousCode()</script>` directly into the text field. Before saving the raw Markdown string to your database, or before serving it, you should run it through a sanitizer.
* **License:** Apache 2.0

### 💻 Maven Dependencies:

```xml
<dependency>
    <groupId>org.commonmark</groupId>
    <artifactId>commonmark</artifactId>
    <version>0.24.0</version> 
</dependency>

<dependency>
    <groupId>com.googlecode.owasp-java-html-sanitizer</groupId>
    <artifactId>owasp-java-html-sanitizer</artifactId>
    <version>20240325.1</version>
</dependency>

```

---

## 🛠️ The Architecture: Where to store and parse?

For a standard React + Spring Boot architecture, the cleanest workflow is:

1. **Storage:** Store the **raw Markdown string** in your database (e.g., PostgreSQL `TEXT` or `VARCHAR`). Do not store pre-rendered HTML. This gives you the flexibility to change your frontend rendering style down the road without migrating database data.
2. **Sanitization:** Sanitize the input on the Spring Boot backend using the OWASP library before saving it to the database to ensure no malicious scripts get stored.
3. **Delivery:** Send the raw Markdown string via your REST API to React.
4. **Rendering:** Let React handle the heavy lifting of parsing and syntax highlighting at runtime using `react-markdown`.

## 💡 What if they need an Editor UI?

If your users want a nice editor UI rather than just a plain textarea, look at **`easy-markdown-editor`** (or its React wrapper `react-simplemde-editor`). It provides a clean side-by-side preview or a toggleable fullscreen Markdown environment that developers usually appreciate, while still saving raw Markdown under the hood.

Would you like an example of how to configure the backend HTML sanitizer specifically for Markdown input?

---

Here is how you can set up the backend sanitization using **Spring Boot** and the **OWASP Java HTML Sanitizer**.

When dealing with a programmer-centric application, you want a balance: you need to block malicious `<script>` tags, but you *don't* want to accidentally strip out legitimate code snippets (like a programmer writing an example HTML tutorial inside a code block).

Because your architecture stores the **raw Markdown**, the safest approach is to use the sanitizer to clean the string before it hits the database.

---

## 1. Create a Sanitizer Service

First, define a reusable service in Spring Boot. We will use a policy that allows standard text formatting but strips out dangerous HTML tags.

```java
import org.owasp.html.HtmlPolicyBuilder;
import org.owasp.html.PolicyFactory;
import org.springframework.stereotype.Service;

@Service
public class MarkdownSanitizerService {

    // Define a strict policy that allows basic safe Markdown-rendered elements
    // but blocks scripts, object/embed tags, and unauthorized styles.
    private final PolicyFactory policy = new HtmlPolicyBuilder()
            .allowElements(
                "p", "b", "i", "em", "strong", "a", "h1", "h2", "h3", "h4", "h5", "h6",
                "ul", "ol", "li", "code", "pre", "blockquote", "hr", "br", "table", 
                "thead", "tbody", "tr", "th", "td", "span", "div"
            )
            .allowAttributes("href").onElements("a")
            .allowAttributes("class").onElements("code", "span", "div") // Crucial for syntax highlighting classes
            .allowUrlProtocols("http", "https", "mailto")
            .requireRelNofollowOnLinks()
            .toFactory();

    public String sanitize(String rawMarkdown) {
        if (rawMarkdown == null) {
            return null;
        }
        // The sanitizer handles the string and strips out anything violating the policy
        return policy.sanitize(rawMarkdown);
    }
}

```

---

## 2. Integrate with your Spring Boot REST Controller

When a user submits a card containing Markdown via a `POST` or `PUT` request, pass the content through the sanitizer before saving it to your repository.

```java
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cards")
public class CardController {

    private final CardRepository cardRepository;
    private final MarkdownSanitizerService sanitizerService;

    public CardController(CardRepository cardRepository, MarkdownSanitizerService sanitizerService) {
        this.cardRepository = cardRepository;
        this.sanitizerService = sanitizerService;
    }

    @PostMapping
    public ResponseEntity<Card> createCard(@RequestBody CardDto cardDto) {
        // Sanitize the incoming Markdown content to prevent XSS
        String safeMarkdown = sanitizerService.sanitize(cardDto.getContent());
        
        Card card = new Card();
        card.setTitle(cardDto.getTitle());
        card.setContent(safeMarkdown); // Storing the clean, raw Markdown
        
        Card savedCard = cardRepository.save(card);
        return ResponseEntity.ok(savedCard);
    }
}

```

---

## 💡 Why this works perfectly for Programmers

1. **Protects Code Blocks:** If a user types ````html <script>alert('test')</script> ```` inside a Markdown code block, the frontend Markdown parser (`react-markdown`) treats it as **plain text** inside a code block rather than executable HTML. The backend sanitizer ensures that even if someone bypasses the editor and sends raw, un-escaped HTML, the database stays safe.
2. **Preserves CSS Classes:** Notice the `.allowAttributes("class").onElements("code", "span")` line in the configuration. This ensures that if you ever do decide to pre-render Markdown on the backend, the CSS classes required by syntax highlighters (like `language-python`) won't be stripped away by your security filter.

