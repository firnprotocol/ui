export const StandardPageContainer = ({
  title,
  subtitle,
  children,
  rightContent,
}) => {
  return (
    <main className="flex-1 relative z-0 overflow-y-auto h-full focus:outline-none">
      <div className="2xl:w-3/4 items-center mt-4 sm:mt-6 mx-auto px-4 sm:px-8 md:px-12 py-8 md:pb-14">
        <span
          className={`
            text-3xl font-medium text-default
            bg-clip-text text-transparent bg-gradient-to-r
            from-purple-600 to-blue-600
          `}
        >
          {title}
        </span>
        {rightContent}
        <div className="text-sm font-medium text-gray-500 dark:text-gray-600 mt-1">
          {subtitle ?? ""}
        </div>
        {children}
      </div>
    </main>
  );
};
