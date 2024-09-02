import { ToastBar, Toaster } from "react-hot-toast";

import { ToastContent } from "./ToastContent";

export const CustomToaster = () => {
  return (
    <Toaster
      position="bottom-right" // top-right
      containerClassName="pt-8"
      toastOptions={{
        // Define default options
        style: {
          background: "transparent",
          padding: "0px",
        },
        className: `
          shadow-blue-100/20
          hover:shadow-slate-100/20 shadow-2xl
          bg-slate-800
          text-slate-400
          `,
        duration: 10000,
      }}
    >
      {(toastData) => (
        <ToastBar
          toast={toastData}
          // style={{}}
        >
          {(props) => <ToastContent toastData={toastData} {...props} />}
        </ToastBar>
      )}
    </Toaster>
  );
};
