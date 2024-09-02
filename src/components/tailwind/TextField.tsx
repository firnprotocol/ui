export const TextField = ({ helperText, endAdornment, error, ...props }) => {
  return (
    <div>
      <div className="group flex h-14 text-left pb-4 space-x-2">
        <div
          className={`
            flex flex-grow h-12 border border-zinc-800 focus-within:border-blue-500
            pl-4 pr-3 py-0.5 rounded-lg bg-zinc-800 font-telegrama text-gray-300
            ${props.container}
          `}
        >
          <input
            spellCheck="false"
            {...props}
            className={`
              ml-auto mr-2
              focus:outline-none
              bg-transparent
              h-full
              w-full
              flex-grow
              placeholder:text-zinc-600
              ${props.className}
            `}
          />
          <div className="flex-1 pt-2 text-gray-400 text-sm h-full text-center">
            {endAdornment}
          </div>
        </div>
      </div>
      <div
        className={`-mt-1 text-sm pb-2 ${error ? "text-red-600" : "text-zinc-500"}`}
      >
        {helperText !== "" ? helperText : "\xa0"}
      </div>
    </div>
  );
};
