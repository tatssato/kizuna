import renderIcon from "@holo-host/identicon";
import { deserializeHash } from "@holochain-open-dev/core-types";
import React, { useEffect, useRef } from "react";
import styles from "./style.module.css";

interface Props {
  hash: string;
  size?: number | undefined;
  shape?: "circle" | "square";
}

const Identicon: React.FC<Props> = ({ hash, size = 32 }) => {
  const didMount = useRef(false);
  const canvas = document.getElementById("identicon") as HTMLCanvasElement;
  const opts = {
    hash: deserializeHash(hash),
    size,
  };
  useEffect(() => {
    if (didMount.current === true) {
      renderIcon(opts, canvas);
    } else {
      didMount.current = true;
    }
  });
  return (
    <div>
      <canvas
        className={styles["icon"]}
        id="identicon"
        width="20"
        height="20"
      />
    </div>
  );
};

export default Identicon;