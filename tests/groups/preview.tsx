// Local-only UI verification; this entry point is not included in the production build.
import React from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { GroupPage } from "@/app/components/groups/GroupPage";
import { GROUP, fixture } from "./fixture";
import "../../src/styles/index.css";
fixture.reset();
createRoot(document.getElementById("root")!).render(
  <MemoryRouter>
    <GroupPage groupId={GROUP} />
  </MemoryRouter>,
);
