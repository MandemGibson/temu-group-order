import { createBrowserRouter, RouterProvider } from "react-router-dom";

const router = createBrowserRouter([
  { path: "/", index: true, lazy: () => import("./pages/landing/landing") },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
