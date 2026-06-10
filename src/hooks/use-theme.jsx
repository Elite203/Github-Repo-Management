import { createContext, useContext, useEffect, useState } from "react";
const ThemeCtx = createContext(null);
function getSystem() {
    if (typeof window === "undefined")
        return "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
export function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState("system");
    const [resolved, setResolved] = useState("dark");
    useEffect(() => {
        const stored = localStorage.getItem("theme") ?? "system";
        setThemeState(stored);
    }, []);
    useEffect(() => {
        const apply = () => {
            const r = theme === "system" ? getSystem() : theme;
            setResolved(r);
            document.documentElement.classList.toggle("dark", r === "dark");
        };
        apply();
        if (theme === "system") {
            const mq = window.matchMedia("(prefers-color-scheme: dark)");
            mq.addEventListener("change", apply);
            return () => mq.removeEventListener("change", apply);
        }
    }, [theme]);
    const setTheme = (t) => {
        localStorage.setItem("theme", t);
        setThemeState(t);
    };
    return <ThemeCtx.Provider value={{ theme, resolved, setTheme }}>{children}</ThemeCtx.Provider>;
}
export function useTheme() {
    const ctx = useContext(ThemeCtx);
    if (!ctx)
        throw new Error("useTheme outside ThemeProvider");
    return ctx;
}
