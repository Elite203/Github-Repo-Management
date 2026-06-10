import { createContext, useContext, useEffect, useState } from "react";
import { fetchUser } from "@/lib/github";
const AuthCtx = createContext(null);
const KEY = "gh_pat_token";
export function GithubAuthProvider({ children }) {
    const [token, setToken] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const t = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
        if (!t) {
            setLoading(false);
            return;
        }
        setToken(t);
        fetchUser(t)
            .then(setUser)
            .catch(() => {
            localStorage.removeItem(KEY);
            setToken(null);
        })
            .finally(() => setLoading(false));
    }, []);
    const signIn = async (t) => {
        const u = await fetchUser(t);
        localStorage.setItem(KEY, t);
        setToken(t);
        setUser(u);
        return u;
    };
    const signOut = () => {
        localStorage.removeItem(KEY);
        setToken(null);
        setUser(null);
    };
    return (<AuthCtx.Provider value={{ token, user, loading, signIn, signOut }}>
      {children}
    </AuthCtx.Provider>);
}
export function useGithubAuth() {
    const ctx = useContext(AuthCtx);
    if (!ctx)
        throw new Error("useGithubAuth outside provider");
    return ctx;
}
