import { clearPublicProductCache, fetchWithPublicProductCache } from '@/lib/publicProductCache.js';

const runtimeConfig = typeof window !== 'undefined' ? window.__ALSENUSSI_CONFIG__ : null;

function normalizeBaseUrl(url) {
    return String(url || '').trim().replace(/\/+$/, '');
}

function isEnabled(value) {
    return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
}

const configuredApiServerUrl = normalizeBaseUrl(runtimeConfig?.API_SERVER_URL)
    || normalizeBaseUrl(import.meta.env.VITE_API_SERVER_URL);
const shouldForceSupabaseFunctions = isEnabled(runtimeConfig?.USE_SUPABASE_FUNCTIONS)
    || isEnabled(import.meta.env.VITE_USE_SUPABASE_FUNCTIONS);
const shouldUseStaticApiFallback = shouldForceSupabaseFunctions || (!import.meta.env.DEV && !configuredApiServerUrl);
const API_SERVER_URL = configuredApiServerUrl
    || (import.meta.env.DEV ? 'http://127.0.0.1:3001' : '/hcgi/api');

let staticApiFallbackPromise = null;

async function getStaticApiFallbackHandler() {
    staticApiFallbackPromise ||= import('@/lib/staticApiFallback.js').then((module) => module.handleStaticApiFallback);
    return staticApiFallbackPromise;
}

function createApiConfigurationErrorResponse(url) {
    return new Response(JSON.stringify({
        error: `API request returned HTML instead of JSON for ${url}. Set VITE_API_SERVER_URL during build, configure /hcgi/api proxy, or set API_SERVER_URL in app-config.js.`,
    }), {
        status: 502,
        statusText: 'API configuration error',
        headers: {
            'content-type': 'application/json; charset=utf-8',
        },
    });
}

function createStaticMvpApiUnavailableResponse(url) {
    return new Response(JSON.stringify({
        error: `This API route is not available in Supabase functions mode: ${url}.`,
    }), {
        status: 503,
        statusText: 'Server API required',
        headers: {
            'content-type': 'application/json; charset=utf-8',
        },
    });
}

const apiServerClient = {
    fetch: async (url, options = {}) => {
        const fetchLiveResponse = async () => {
            if (shouldUseStaticApiFallback) {
                const handleStaticApiFallback = await getStaticApiFallbackHandler();
                const fallbackResponse = await handleStaticApiFallback(url, options);
                if (fallbackResponse) return fallbackResponse;

                return createStaticMvpApiUnavailableResponse(url);
            }

            const response = await window.fetch(API_SERVER_URL + url, options);
            const contentType = response.headers.get('content-type') || '';

            if (contentType.toLowerCase().includes('text/html')) {
                return createApiConfigurationErrorResponse(url);
            }

            return response;
        };

        const method = String(options.method || 'GET').toUpperCase();
        if (method !== 'GET' && new URL(url, window.location.origin).pathname.startsWith('/products')) {
            clearPublicProductCache();
        }

        return fetchWithPublicProductCache(url, options, fetchLiveResponse);
    }
};

export default apiServerClient;

export { apiServerClient };
