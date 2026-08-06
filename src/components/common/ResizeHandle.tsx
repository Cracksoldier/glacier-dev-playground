import { Separator, type SeparatorProps } from "react-resizable-panels";
import styles from "./ResizeHandle.module.css";

interface ResizeHandleProps extends Omit<SeparatorProps, "aria-label"> {
  label: string;
}

function ResizeHandle({ label, className, ...rest }: ResizeHandleProps) {
  return (
    <Separator
      aria-label={label}
      className={className ? `${styles.handle} ${className}` : styles.handle}
      {...rest}
    />
  );
}

export default ResizeHandle;
