import { LoadingSpinner } from "@components/loading/LoadingSpinner";

export const ButtonLoadingSpinner = ({ className }) => {
  return <LoadingSpinner className={`!text-gray-50 opacity-50 ${className}`} />;
};
