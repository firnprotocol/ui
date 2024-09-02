import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

export const ToastContent = ({ toastData, message }) => {
  let toastContainerClassName;
  let fancyIcon;
  if (toastData.type === "success") {
    toastContainerClassName = "shadow-green-lg dark:shadow-green-lg";
    fancyIcon = <CheckCircleIcon className="h-5 w-5 text-green-700" />;
  } else if (toastData.type === "loading") {
    toastContainerClassName = "shadow-lg dark:shadow-indigo-lg"; // same as nothing?
    fancyIcon = <ClockIcon className="h-5 w-5 text-yellow-700" />;
  } else if (toastData.type === "error") {
    toastContainerClassName = "shadow-red-lg dark:shadow-red-lg";
    fancyIcon = <ExclamationCircleIcon className="h-5 w-5 text-red-700" />;
  } else {
    // cheating, using this case to get an "info" style toast; probably a better way to add a custom type
    toastContainerClassName = "shadow-lg dark:shadow-indigo-lg";
    fancyIcon = <InformationCircleIcon className="h-5 w-5 text-cyan-700" />;
  }

  return (
    <div
      className={`
        flex rounded
        min-w-[280px]
        pl-2 pt-1 pb-2
        bg-zinc-900  transition-all

        border-2 border-zinc-600 hover:border-slate-100
        text-zinc-400
        ${toastContainerClassName}
      `}
    >
      <div className=" flex flex-grow pt-1">
        <div className="flex-shrink justify-items-center align-middle self-center">
          {fancyIcon}
        </div>
        <div className="flex-grow">
          <div className="text-sm">{message}</div>
        </div>
      </div>
      <div className="flex-shrink px-2">
        {toastData.type !== "loading" && (
          <button
            className={`
            rounded-full
            h-6 w-6
            mt-1.5
            focus:outline-none active:outline-none
            hover:bg-red-900
            text-zinc-400 hover:text-red-600
            bg-opacity-40 hover:bg-opacity-30 opacity-80
          `}
            onClick={() => toast.dismiss(toastData.id)}
          >
            <XMarkIcon className="h-full w-full p-1 align-middle place-self-center inline" />
          </button>
        )}
      </div>
    </div>
  );
};
