import { router, usePage } from "@inertiajs/react"
import { useCallback, useMemo } from "react"

export function useNavigate() {
  return useCallback((url: string | number, options?: { replace?: boolean }) => {
    if (typeof url === "number") {
      if (typeof window !== "undefined") {
        window.history.go(url)
      }
      return
    }
    router.visit(url, { replace: options?.replace })
  }, [])
}

export function useLocation() {
  const page = usePage()
  const [pathname, search] = page.url.split("?")
  return useMemo(
    () => ({
      pathname: pathname || "/",
      search: search ? `?${search}` : "",
      hash: typeof window !== "undefined" ? window.location.hash : "",
      state: null,
      key: "default",
    }),
    [pathname, search]
  )
}

export function useSearchParams(): [
  URLSearchParams,
  (
    nextInit:
      | URLSearchParams
      | Record<string, string | number | boolean | undefined | null>
      | ((prev: URLSearchParams) => URLSearchParams),
    navigateOpts?: { replace?: boolean }
  ) => void,
] {
  const page = usePage()
  const searchParams = useMemo(() => {
    const parts = page.url.split("?")
    return new URLSearchParams(parts[1] || "")
  }, [page.url])

  const setSearchParams = useCallback(
    (
      nextInit:
        | URLSearchParams
        | Record<string, string | number | boolean | undefined | null>
        | ((prev: URLSearchParams) => URLSearchParams),
      navigateOpts?: { replace?: boolean }
    ) => {
      let next: URLSearchParams
      if (typeof nextInit === "function") {
        next = nextInit(searchParams)
      } else if (nextInit instanceof URLSearchParams) {
        next = nextInit
      } else {
        next = new URLSearchParams()
        for (const [k, v] of Object.entries(nextInit)) {
          if (v !== undefined && v !== null && v !== "") {
            next.set(k, String(v))
          }
        }
      }

      const pathname = page.url.split("?")[0] || "/"
      const qs = next.toString()
      const targetUrl = qs ? `${pathname}?${qs}` : pathname

      router.get(
        targetUrl,
        {},
        {
          preserveState: true,
          preserveScroll: true,
          replace: navigateOpts?.replace ?? false,
        }
      )
    },
    [page.url, searchParams]
  )

  return [searchParams, setSearchParams]
}

export function useParams<T extends Record<string, string | undefined>>(): T {
  const page = usePage()
  return (page.props as unknown as T) || ({} as T)
}
