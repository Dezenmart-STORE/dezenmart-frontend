import { useState, useCallback, lazy, Suspense, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import SubTabs from "./Tabs";
import LoadingSpinner from "../../../common/LoadingSpinner";

const CreateProduct = lazy(() => import("./CreateProduct"));
const ProductList = lazy(() => import("../../../product/ProductList"));

const ProductContainer: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSubTab, setActiveSubTab] = useState<"create" | "view">("create");

  // Check if we should navigate to create tab from URL
  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "create") {
      setActiveSubTab("create");
      // Clear the action param after setting it
      searchParams.delete("action");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleSubTabChange = useCallback((tab: "create" | "view") => {
    setActiveSubTab(tab);
  }, []);

  const handleProductCreated = useCallback(() => {
    setActiveSubTab("view");
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <SubTabs
        activeSubTab={activeSubTab}
        onSubTabChange={handleSubTabChange}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, x: activeSubTab === "create" ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: activeSubTab === "create" ? 20 : -20 }}
          transition={{ duration: 0.2 }}
        >
          <Suspense
            fallback={
              <div className="flex justify-center items-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            }
          >
            {activeSubTab === "create" ? (
              <CreateProduct onProductCreated={handleProductCreated} />
            ) : (
              <ProductList
                title="Products"
                className="mt-6 md:mt-10"
                isCategoryView={false}
                showViewAll={false}
                isUserProducts
              />
            )}
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};

export default ProductContainer;
