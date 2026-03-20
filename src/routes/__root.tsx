import { createRootRoute, Outlet } from "@tanstack/react-router";
import BaseLayout from "@/layouts/base-layout";
import { CommandPalette } from "@/components/command/command-palette";

/* import { TanStackRouterDevtools } from '@tanstack/react-router-devtools' */

/*
 * Uncomment the code in this file to enable the router devtools.
 */

function Root() {
  return (
    <>
      <BaseLayout>
        <Outlet />
      </BaseLayout>
      <CommandPalette />
      {/* Uncomment the following line to enable the router devtools */}
      {/* <TanStackRouterDevtools /> */}
    </>
  );
}

export const Route = createRootRoute({
  component: Root,
});
