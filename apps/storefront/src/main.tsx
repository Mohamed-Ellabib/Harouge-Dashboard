import "@fontsource-variable/cairo";

import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "./App";
import "./styles.css";

document.documentElement.lang = "ar";
document.documentElement.dir = "rtl";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Storefront root element was not found.");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
