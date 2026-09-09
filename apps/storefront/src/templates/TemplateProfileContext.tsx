import { createContext, useContext } from "react";
import type { ConfiguredStorefrontProfileDto } from "../types";

export const TemplateProfileContext = createContext<ConfiguredStorefrontProfileDto | null>(null);
export const useTemplateProfile = () => useContext(TemplateProfileContext);
