"use client";

/* eslint-disable jsx-a11y/alt-text */
import type { ImageProps } from "next/image";

import { LazyMotion, domAnimation, m, useAnimation } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@heroui/react";

const animationVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

/** Design ProMax: Marketing/hero-sections fade-in-image */
export const FadeInImage = (props: ImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const animationControls = useAnimation();
  const { className, fill, ...rest } = props;

  useEffect(() => {
    if (isLoaded) {
      animationControls.start("visible");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        animate={animationControls}
        initial="hidden"
        transition={{ duration: 0.5, ease: "easeOut" }}
        variants={animationVariants}
        className={cn(fill && "absolute inset-0")}
      >
        <Image
          {...rest}
          fill={fill}
          className={className}
          onLoad={() => setIsLoaded(true)}
          sizes={props.sizes ?? "100vw"}
        />
      </m.div>
    </LazyMotion>
  );
};

export default FadeInImage;
