import { Switch } from "@headlessui/react";

export const ToggleSwitch = ({
  label,
  value,
  onChange,
  className,
  disabled,
}) => {
  return (
    <Switch.Group>
      <div className="flex items-center">
        <Switch.Label className="mr-4 text-gray-400">{label}</Switch.Label>
        <Switch
          checked={value}
          onChange={onChange}
          disabled={disabled}
          className={`
            bg-gradient-to-r
            ${value ? " from-sky-600 to-blue-600" : "from-slate-900 to-slate-900"}
            relative inline-flex items-center h-6 rounded-full w-11
            transition-colors focus:outline-none
            ${className}
          `}
        >
          <span
            className={`
              ${value ? "translate-x-6" : "translate-x-1"}
              inline-block w-4 h-4 transform bg-white rounded-full transition-transform
            `}
          />
        </Switch>
      </div>
    </Switch.Group>
  );
};
