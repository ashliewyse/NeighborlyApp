import React from "react";
import { useLocation } from "react-router";
export { MemoryRouter } from "react-router";
export function LocationProbe() {
  const location = useLocation();
  return React.createElement(
    "output",
    { "data-location": true },
    location.pathname + location.search,
  );
}
