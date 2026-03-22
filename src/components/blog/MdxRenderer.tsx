import { MDXRemote } from "next-mdx-remote/rsc";
import { mdxComponents, TLDR, Callout, KeyTakeaways } from "./MdxComponents";

const components = {
  ...mdxComponents,
  TLDR,
  Callout,
  KeyTakeaways,
};

export function MdxRenderer({ source }: { source: string }) {
  return (
    <div className="mdx-content">
      <MDXRemote source={source} components={components} />
    </div>
  );
}
