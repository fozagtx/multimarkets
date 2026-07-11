"use client";

/**
 * Design ProMax — Application/sidebars (19)__sidebar-drawer
 * Mobile drawer + desktop fixed rail (same children)
 */

import type { ModalProps } from "@heroui/react";
import React from "react";
import { Drawer, DrawerBody, DrawerContent, cn } from "@heroui/react";

const SidebarDrawer = React.forwardRef<
  HTMLDivElement,
  ModalProps & {
    sidebarWidth?: number;
    sidebarPlacement?: "left" | "right";
    hideCloseButton?: boolean;
  }
>(
  (
    {
      children,
      className,
      onOpenChange,
      isOpen,
      sidebarWidth = 288,
      classNames = {},
      sidebarPlacement = "left",
      hideCloseButton,
      ...props
    },
    ref,
  ) => {
    return (
      <>
        {/* Mobile drawer */}
        <Drawer
          ref={ref}
          {...props}
          hideCloseButton={hideCloseButton}
          classNames={{
            ...classNames,
            wrapper: cn("!w-[var(--sidebar-width)] sm:hidden", classNames?.wrapper, {
              "!items-start !justify-start ": sidebarPlacement === "left",
              "!items-end !justify-end": sidebarPlacement === "right",
            }),
            base: cn(
              "w-[var(--sidebar-width)] !m-0 p-0 h-full max-h-full",
              classNames?.base,
              className,
              {
                "inset-y-0 left-0 max-h-[none] rounded-l-none !justify-start":
                  sidebarPlacement === "left",
                "inset-y-0 right-0 max-h-[none] rounded-r-none !justify-end":
                  sidebarPlacement === "right",
              },
            ),
            body: cn("p-0", classNames?.body),
            closeButton: cn("z-50 text-default-500", classNames?.closeButton),
          }}
          isOpen={isOpen}
          radius="none"
          scrollBehavior="inside"
          style={{
            // @ts-expect-error CSS var for drawer width
            "--sidebar-width": `${sidebarWidth}px`,
          }}
          onOpenChange={onOpenChange}
        >
          <DrawerContent>
            <DrawerBody>{children}</DrawerBody>
          </DrawerContent>
        </Drawer>

        {/* Desktop fixed rail */}
        <div
          className={cn(
            "hidden h-full max-w-[var(--sidebar-width)] overflow-x-hidden overflow-y-auto sm:flex",
            className,
          )}
          style={
            {
              "--sidebar-width": `${sidebarWidth}px`,
            } as React.CSSProperties
          }
        >
          {children}
        </div>
      </>
    );
  },
);

SidebarDrawer.displayName = "SidebarDrawer";

export default SidebarDrawer;
