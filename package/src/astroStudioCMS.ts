import { imageService } from "@unpic/astro/service";
import { AstroError } from "astro/errors";
import { createResolver, defineIntegration } from "astro-integration-kit";
import { corePlugins } from "astro-integration-kit/plugins";
import { loadEnv } from "vite";
import { optionsSchema } from "./schemas";
import { integrationLogger } from "./utils";
import dbInject from "./db/integration";

const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } = loadEnv( "all", process.cwd(), "GITHUB");

// This is the primary user-facing integration that will be used to install the Astro Studio CMS
/**
 * Astro Studio CMS Integration - Experimental
 */
export default defineIntegration({
    name: "astro-studio-cms",
    optionsSchema,
    plugins: [...corePlugins],
    setup({ options }) {
        return {
            "astro:config:setup": ({ 
                watchIntegration, 
                addMiddleware, 
                addIntegration,
                addVirtualImports,
                updateConfig,
                config,
                logger,
                injectRoute,
            }) => {
                // Check for Verbose Mode
                const isVerbose = options.verbose;

                // Create Resolver for Virtual Imports
                const { resolve } = createResolver(import.meta.url);
                
                // Check for SSR Mode
                if (config.output !== "server" ) {
                    throw new AstroError("Astro Studio CMS is only supported in 'Output: server' SSR mode.");
                }

                // Check for Site URL
                if (!config.site) {
                    throw new AstroError("Astro Studio CMS requires a 'site' configuration in your Astro Config.");
                }

                // Watch Integration for changes
                watchIntegration(resolve());

                // Check for Required Environment Variables
                if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
                    throw new AstroError("GitHub OAuth Client ID and Secret are required to use Astro Studio CMS.");
                }

                // Add Virtual Imports
                integrationLogger(
                    logger, isVerbose, 
                    "info", 
                    "Adding Virtual Imports..."
                );
                addVirtualImports({
                    'virtual:astro-studio-cms:config': `export default ${JSON.stringify(options) };`,
                })

                // Add Authentication Middleware if not disabled
                if (!options.disableAuth) {
                    integrationLogger(
                        logger, isVerbose, 
                        "info", 
                        "Authentication Middleware Enabled"
                    );
                    addMiddleware({
                        entrypoint: resolve('./middleware/index.ts'),
                        order: "post",
                    });
                } else {
                    // Log that Authentication Middleware is Disabled
                    integrationLogger(
                        logger, isVerbose, 
                        "info", 
                        "Authentication Middleware Disabled"
                    );
                }

                // Add Page Routes
                integrationLogger(
                    logger, isVerbose, 
                    "info", 
                    "Adding Page Routes..."
                );
                injectRoute({ 
                    pattern: config.base, 
                    entrypoint: resolve('./pages/index.astro'), 
                });
                injectRoute({ 
                    pattern: `${config.base}about/`, 
                    entrypoint: resolve('./pages/about.astro'), 
                });
                injectRoute({ 
                    pattern: `${config.base}blog/`, 
                    entrypoint: resolve('./pages/blog/index.astro'), 
                });
                injectRoute({ 
                    pattern: `${config.base}blog/[slug]`, 
                    entrypoint: resolve('./pages/blog/[...slug].astro'), 
                });
                injectRoute({ 
                    pattern: `${config.base}dashboard/`, 
                    entrypoint: resolve('./pages/dashboard/index.astro'), 
                });
                injectRoute({ 
                    pattern: `${config.base}dashboard/profile`, 
                    entrypoint: resolve('./pages/dashboard/profile.astro'), 
                });
                injectRoute({ 
                    pattern: `${config.base}dashboard/new-post`, 
                    entrypoint: resolve('./pages/dashboard/new-post.astro'), 
                });
                injectRoute({ 
                    pattern: `${config.base}dashboard/login`, 
                    entrypoint: resolve('./pages/dashboard/login/index.astro'), 
                });
                injectRoute({ 
                    pattern: `${config.base}dashboard/edit/home`, 
                    entrypoint: resolve('./pages/dashboard/edit/home.astro'), 
                });
                injectRoute({ 
                    pattern: `${config.base}dashboard/edit/about`, 
                    entrypoint: resolve('./pages/dashboard/edit/about.astro'), 
                });
                injectRoute({ 
                    pattern: `${config.base}dashboard/edit/[...slug]`, 
                    entrypoint: resolve('./pages/dashboard/edit/[...slug].astro'), 
                });
                injectRoute({ 
                    pattern: `${config.base}rss.xml`, 
                    entrypoint: resolve('./pages/rss.xml.ts'), 
                });
                injectRoute({ 
                    pattern: `${config.base}dashboard/login/github/`, 
                    entrypoint: resolve('./pages/dashboard/login/github/index.ts'), 
                });
                injectRoute({ 
                    pattern: `${config.base}dashboard/login/github/callback/`, 
                    entrypoint: resolve('./pages/dashboard/login/github/callback.ts'), 
                });
                injectRoute({ 
                    pattern: `${config.base}dashboard/logout/`, 
                    entrypoint: resolve('./pages/dashboard/logout.ts'), 
                });

                // Add Database Integration
                integrationLogger(
                    logger, isVerbose, 
                    "info", 
                    "Loading Custom AstroDB configuration..."
                );
                addIntegration(dbInject())

                // Update Astro Config
                integrationLogger(
                    logger, isVerbose, 
                    "info", 
                    "Updating Astro Config..."
                );
                updateConfig({
                    image: {
                        service: imageService({
                            placeholder: "blurhash",
                            fallbackService: "squoosh",
                        }),
                    }
                });

                integrationLogger(
                    logger, isVerbose,
                    "info", 
                    "Astro Studio CMS Setup Complete!"
                );
            }
        }
    }
})
