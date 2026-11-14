import { useMemo } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

marked.setOptions({ gfm: true, breaks: false });

const ALLOWED_TAGS = [
  "h1","h2","h3","h4","h5","h6","p","a","ul","ol","li","blockquote","code","pre",
  "em","strong","del","hr","br","table","thead","tbody","tr","th","td","img","span","div",
];
const ALLOWED_ATTR = ["href","title","src","alt","class","start","reversed"];

export function Markdown({ content, className = "" }: { content: string; className?: string }) {
  const html = useMemo(() => {
    const raw = marked.parse(content, { async: false }) as string;
    return DOMPurify.sanitize(raw, { ALLOWED_TAGS, ALLOWED_ATTR, ALLOW_DATA_ATTR: false });
  }, [content]);
  return <div className={`md-body ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
