import { notFound } from "next/navigation";

import TestRolesClient from "./test-roles-client";

export default function TestRolesPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <TestRolesClient />;
}
