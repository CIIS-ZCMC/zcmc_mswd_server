import { fetchBlob } from "@/lib/api-client"

type PdfParams = Record<string, string | number | boolean | undefined>

/**
 * Open a server-rendered PDF (an /api path) in a new tab.
 *
 * The tab is opened synchronously, inside the click, so pop-up blockers allow it;
 * the PDF is then fetched with the session headers (fetchBlob) and shown from a
 * blob URL. On failure the tab is closed and the ApiError is rethrown, so the
 * caller can show the server's message instead of a tab of raw JSON.
 */
export async function openPdfInNewTab(
  path: string,
  params?: PdfParams
): Promise<void> {
  const tab = window.open("", "_blank")

  try {
    const blob = await fetchBlob(path, params)
    const url = URL.createObjectURL(blob)

    if (tab) {
      tab.location.href = url
    } else {
      window.open(url, "_blank")
    }

    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (err) {
    tab?.close()
    throw err
  }
}
