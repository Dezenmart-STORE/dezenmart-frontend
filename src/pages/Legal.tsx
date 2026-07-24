import { useNavigate } from "react-router-dom";
import { LiaAngleLeftSolid } from "react-icons/lia";
import { HiExclamationTriangle } from "react-icons/hi2";
import { useGetCurrentTermsQuery } from "../store/api";
import type { LegalDocType } from "../utils/types";
import { useSEO } from "../hooks/useSEO";
import Container from "../components/common/Container";
import LoadingSpinner from "../components/common/LoadingSpinner";
import MarkdownContent from "../components/common/MarkdownContent";

// Static SEO/meta per document. Adding a new legal type = add a route + an
// entry here; everything else (fetch, render, format) is driven by `type`.
const META: Record<LegalDocType, { title: string; description: string }> = {
  terms_of_use: {
    title: "Terms of Service",
    description: "The terms governing your use of the DezenMart platform.",
  },
  privacy_policy: {
    title: "Privacy Policy",
    description: "How DezenMart collects, uses, and protects your personal information.",
  },
  cookie_policy: {
    title: "Cookie Policy",
    description: "How DezenMart uses cookies and similar technologies.",
  },
};

const formatDate = (iso?: string): string => {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
};

interface Props {
  type: LegalDocType;
}

const Legal: React.FC<Props> = ({ type }) => {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch, isFetching } = useGetCurrentTermsQuery(type);
  const meta = META[type];

  useSEO({
    title: data?.title ?? meta.title,
    description: meta.description,
  });

  return (
    <div className="bg-Dark min-h-screen text-white">
      <Container className="max-w-3xl">
        {/* Top bar: back + version/updated meta */}
        <div className="flex items-center justify-between gap-3 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-gray-400 hover:text-white text-sm transition-colors"
            aria-label="Go back"
          >
            <LiaAngleLeftSolid className="w-5 h-5" />
            Back
          </button>
          {data && (
            <span className="text-xs text-gray-500">
              v{data.version}
              {data.updatedAt ? ` · Updated ${formatDate(data.updatedAt)}` : ""}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-24">
            <LoadingSpinner />
          </div>
        ) : isError || !data ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 mt-6 text-center">
            <HiExclamationTriangle className="w-8 h-8 mx-auto text-red-400 mb-3" />
            <p className="text-sm text-gray-300 mb-4">
              We couldn't load the {meta.title.toLowerCase()} right now.
            </p>
            <button
              onClick={() => refetch()}
              className="text-red-400 hover:text-red-300 text-sm font-medium"
            >
              Try again
            </button>
          </div>
        ) : (
          <article className={`pb-8 ${isFetching ? "opacity-70" : ""}`}>
            <MarkdownContent content={data.content} />
          </article>
        )}
      </Container>
    </div>
  );
};

export default Legal;
