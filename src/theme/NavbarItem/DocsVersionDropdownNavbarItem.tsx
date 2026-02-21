import React from "react"
import { useActiveDocContext } from "@docusaurus/plugin-content-docs/client"
import DefaultDocsVersionDropdownNavbarItem from "@theme-original/NavbarItem/DocsVersionDropdownNavbarItem"
import type { Props } from "@theme/NavbarItem/DocsVersionDropdownNavbarItem"

export default function DocsVersionDropdownNavbarItem(props: Props) {
  const activeDocContext = useActiveDocContext(props.docsPluginId)
  if (!activeDocContext.activeVersion) {
    return null
  }
  return <DefaultDocsVersionDropdownNavbarItem {...props} />
}
