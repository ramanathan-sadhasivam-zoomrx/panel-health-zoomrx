import * as React from "react";

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}

export const Tabs = ({ value, onValueChange, className, children }: TabsProps) => {
  return <div className={className}>{React.Children.map(children, child => {
    if (React.isValidElement(child) && child.type === TabsList) {
      return React.cloneElement(child, { value, onValueChange });
    }
    if (React.isValidElement(child) && child.type === TabsContent) {
      return React.cloneElement(child, { activeValue: value });
    }
    return child;
  })}</div>;
};

interface TabsListProps {
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}

export const TabsList = ({ value, onValueChange, className, children }: TabsListProps) => (
  <div className={"inline-flex bg-[#F6F8FB] rounded-[5px] p-1 " + (className || "")}>{
    React.Children.map(children, child => {
      if (React.isValidElement(child)) {
        const el = child as React.ReactElement<any>;
        return React.cloneElement(el, { selected: el.props.value === value, onClick: () => onValueChange && onValueChange(el.props.value) });
      }
      return child;
    })
  }</div>
);

interface TabsTriggerProps {
  value: string;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}

export const TabsTrigger = ({ value, selected, onClick, className, children }: TabsTriggerProps) => (
  <button
    className={
      "px-4 py-2 rounded-[5px] text-sm font-medium " +
      (selected ? "bg-white text-[#1E41EB] shadow border border-[#1E41EB]" : "text-gray-600 hover:bg-gray-100") +
      (className ? " " + className : "")
    }
    onClick={onClick}
    type="button"
  >
    {children}
  </button>
);

interface TabsContentProps {
  value: string;
  activeValue?: string;
  className?: string;
  children: React.ReactNode;
}

export const TabsContent = ({ value, activeValue, className, children }: TabsContentProps) => {
  if (activeValue !== value) return null;
  return <div className={className}>{children}</div>;
}; 