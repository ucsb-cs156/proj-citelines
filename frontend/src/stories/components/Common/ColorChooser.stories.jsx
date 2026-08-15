import React, { useState } from "react";
import ColorChooser from "main/components/Common/ColorChooser";

export default {
  title: "components/Common/ColorChooser",
  component: ColorChooser,
};

const Template = (args) => {
  const [color, setColor] = useState(args.value ?? "");
  return <ColorChooser {...args} value={color} onChange={setColor} />;
};

export const Default = Template.bind({});
Default.args = {
  value: "",
};

export const PreselectedColor = Template.bind({});
PreselectedColor.args = {
  value: "#1e88e5",
};
