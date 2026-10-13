import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Route, Switch } from "wouter";
import { Dashboard } from "./Dashboard";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element is missing");

createRoot(root).render(
  <StrictMode>
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route><main className="empty-page">Page not found</main></Route>
    </Switch>
  </StrictMode>,
);
