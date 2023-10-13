import { assertIsNotNullish } from "@jaybeeuu/utilities";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import "./index.css";

const root = document.getElementById("root");
assertIsNotNullish(root);

createRoot(root).render(
  <App />
);
