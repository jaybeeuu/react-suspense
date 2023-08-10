import { assertIsNotNullish } from "@jaybeeuu/utilities";
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import "./index.css";

const root = document.getElementById("root");
assertIsNotNullish(root);

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
