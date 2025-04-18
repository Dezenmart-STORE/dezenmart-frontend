import { lazy, StrictMode, Suspense } from "react";
import "./index.css";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";
import { createRoot } from "react-dom/client";
import { Configuration } from "@react-md/layout";
import Layout from "./components/layout/Layout.tsx";
import ViewTrade from "./pages/ViewTrade.tsx";
import Loadscreen from "./pages/Loadscreen.tsx";

const Login = lazy(() => import("./pages/Login.tsx"));
const Home = lazy(() => import("./pages/Home.tsx"));
const Product = lazy(() => import("./pages/Product.tsx"));
const SingleProduct = lazy(() => import("./pages/SingleProduct.tsx"));
const Account = lazy(() => import("./pages/Account.tsx"));
const Trade = lazy(() => import("./pages/Trade.tsx"));
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
        <Suspense fallback={<Loadscreen />}>
          <Outlet />
        </Suspense>
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
        index: true,
        element: <Home />,
      },
      {
        path: "/login",
        element: <Login />,
      },
      {
        path: "/account",
        element: <Account />,
      },
      {
        path: "/product",
        element: <Product />,
      },
      {
        path: "/product/category/:categoryName",
        element: <Product />,
      },
      {
        path: "/product/:id",
        element: <SingleProduct />,
      },
      {
        path: "/trades",
        element: <Trade />,
      },
      {
        path: "/trades/viewtrades",
        element: <ViewTrade />,
      },
      {
        path: "/load",
        element: <Loadscreen />,
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
