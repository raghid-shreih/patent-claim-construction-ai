import { useEffect } from "react";

/** Sets the page title and meta description while the component is mounted, then restores them. */
export function useDocumentMetadata(pageTitle: string, pageDescription: string) {
  useEffect(() => {
    const previousTitle = document.title;
    let descriptionElement = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const createdDescriptionElement = !descriptionElement;
    if (!descriptionElement) {
      descriptionElement = document.createElement("meta");
      descriptionElement.name = "description";
      document.head.appendChild(descriptionElement);
    }
    const previousDescription = descriptionElement.content;
    document.title = pageTitle;
    descriptionElement.content = pageDescription;
    return () => {
      document.title = previousTitle;
      if (createdDescriptionElement) descriptionElement?.remove();
      else if (descriptionElement) descriptionElement.content = previousDescription;
    };
  }, [pageTitle, pageDescription]);
}
