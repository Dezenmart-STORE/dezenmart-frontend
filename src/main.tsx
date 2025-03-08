

import { StrictMode } from "react";
import "./index.css";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import Layout from "./ui/Layout.tsx";
import Login from "./pages/Login.tsx";
import Loadscreen from "./pages/Loadscreen.tsx";
import Home from "./pages/Home.tsx";
import Product from "./pages/Product.tsx";
import SingleProduct from "./pages/SingleProduct.tsx";
import { Configuration } from "@react-md/layout";
import Account from "./pages/Account.tsx";
// import About from "./pages/About.tsx";
// import Market from "./pages/Market.tsx";
// import Photos from "./pages/Photos.tsx";
// import Members from "./pages/Members.tsx";
// import Heros from "./pages/Heros.tsx";
// import Article from "./pages/Article.tsx";
// import Contact from "./pages/Contact.tsx";
// import Account from "./pages/Account.tsx";
// import NotFound from "./pages/NotFound.tsx";

const RouterLayout = () => {
  return (
    <Configuration>
      <Layout>
        <Outlet />
      </Layout>
    </Configuration>
  );
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <RouterLayout />,
    children: [
      {
        path: "/",
        element: <App />,
      },
      {
        path: "/login",
        element: <Login />,
      },
      {
        path: "/load",
        element: <Loadscreen />,
      },
      {
        path: "/account",
        element: <Account />,
      },
      {
        path: "/",
        element: <Home />,
      },
      {
        path: "/product",
        element: <Product />,
      },
      {
        path: "/single-product/:id",
        element: <SingleProduct />,
      },
      // {
      //   path: "/member/:id",
      //   element: <Members />,
      // },
      // {
      //   path: "/heros",
      //   element: <Heros />,
      // },
      // {
      //   path: "/article",
      //   element: <Article />,
      // },
      // {
      //   path: "/article/:id",
      //   element: <Article />,
      // },
      // {
      //   path: "/contact",
      //   element: <Contact />,
      // },
      // {
      //   path: "/account",
      //   element: <Account />,
      // },
      // {
      //   path: "",
      //   element: <NotFound />,
      // },
    ],
  },
]);
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);


