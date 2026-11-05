import React from "react";
import { createRoot } from "react-dom/client";
import { ClaimConstructor } from "../src/ui";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode><ClaimConstructor apiBase="/api/claim-constructor" homeHref="/claim-constructor" /></React.StrictMode>,
);
