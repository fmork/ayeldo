workspace "Image Sharing & Selling Platform" "Vision/Feature Level" {

    !identifiers hierarchical

    model {
        user = person "Creator (User)" "Uploads and manages images."
        visitor = person "Client (Visitor)" "Browses, views, and purchases images; may be anonymous."
        admin = person "Administrator" "Operates and maintains the platform."
        owner = person "Platform Owner" "Accountable for business outcomes."

        oidc = softwareSystem "OIDC Provider" "User authentication (e.g., Amazon Cognito)" {
            tags "External"
        }
        payments = softwareSystem "Payment Provider" "Payment authorization & webhooks (e.g., Stripe)" {
            tags "External"
        }

        platform = softwareSystem "Image Sharing & Selling Platform" "Web-based service to share and sell images." {

            web = container "Web App" "Browser UI. Initiates auth via HTTP API; receives only httpOnly session cookies." "TypeScript/React" {
                tags "UI"
            }

            api = container "HTTP API / Controllers" "Thin HTTP layer (routing, auth context, delegates to Flow/Query Services)." "TypeScript (Node.js)" {
                tags "API"
            }

            flow = container "Flow/Query Services" "Orchestration layer: validates input (zod), enforces policies, composes domain service calls, emits events." "TypeScript (Node.js)" {
                tags "Service"
            }

            albums = container "Album Service" "Album hierarchy, visibility, ACL attachment." "Domain service" {
                tags "Service"
            }
            images = container "Image Service" "Image registration/metadata, upload coordination." "Domain service" {
                tags "Service"
            }
            pricelists = container "Price List Service" "Quantity-based price list management." "Domain service" {
                tags "Service"
            }
            pricing = container "Pricing Engine" "Computes prices from price lists and cart." "Domain service" {
                tags "Service"
            }
            carts = container "Cart Service" "Anonymous carts, sessions, totals." "Domain service" {
                tags "Service"
            }
            orders = container "Order Service" "Checkout, order lifecycle & fulfillment." "Domain service" {
                tags "Service"
            }
            policy = container "Policy/Authorization Service" "Evaluates resource-level access policies." "Domain service" {
                tags "Service"
            }
            eventbus = container "Event Bus" "Domain events and async processing." "Event/Queue" {
                tags "Event/Queue"
            }
            analytics = container "Analytics Aggregator" "Consumes events, updates counters/rollups." "Consumer" {
                tags "Service"
            }
            stats = container "Stats Store" "Views/downloads/buys counters and aggregates." "Data store" {
                tags "Data Store"
            }
            metadata = container "Metadata Store" "Albums, images, carts, orders, price lists." "Data store" {
                tags "Data Store"
            }
            assets = container "Asset Storage" "Binary image assets & derivatives (thumbnails, web sizes)." "Object storage" {
                tags "Storage"
            }

            // Core call graph
            user -> web "Uses"
            visitor -> web "Uses"
            admin -> web "Uses"
            web -> api "All UI calls; no tokens in browser"
            api -> web "Redirects/callbacks; sets httpOnly session cookie"

            // Authentication through API
            user -> oidc "Authenticates via redirect (UI)"
            admin -> oidc "Authenticates via redirect (UI)"
            owner -> oidc "Authenticates via redirect (UI)"
            api -> oidc "Start auth / token exchange (back channel)"
            oidc -> api "Auth code / tokens (back channel)"

            api -> stats "Query metrics for UI"

            // Delegation boundary
            api -> flow "Delegate request (validated orchestration)"
            flow -> web "Return composed responses"

            // Flow layer to domain services
            flow -> albums "Manage albums"
            flow -> images "Manage images / uploads"
            flow -> pricelists "Manage price lists"
            flow -> pricing "Quote totals"
            flow -> carts "Create/update cart"
            flow -> orders "Create/advance order"
            flow -> policy "Check access to albums/images"
            flow -> eventbus "Emit domain events"
            flow -> metadata "Read/write data"
            flow -> stats "Query aggregates/metrics"

            // Data and processing
            albums -> metadata "Persist album metadata"
            images -> metadata "Persist image metadata"
            images -> eventbus "Emit ImageUploaded"
            carts -> metadata "Persist carts"
            orders -> metadata "Persist orders"
            pricelists -> metadata "Persist price lists"
            pricing -> pricelists "Read price list rules"
            policy -> metadata "Lookup ACLs/visibility"
            images -> assets "Coordinate uploads / read sizes"
            eventbus -> analytics "Deliver events"
            analytics -> stats "Persist counters/rollups"

            // Payments
            orders -> payments "Create payment session/intents"
            payments -> orders "Webhooks: payment_succeeded/failed"
        }

        owner -> platform "Owns"
    }

    views {

        systemContext platform "system-context" {
            include *
            autoLayout lr
        }

        container platform "containers" {
            include *
            autoLayout lr
        }

        dynamic platform "flow-1-signup-and-customer-association" "User Sign-Up" {
            autoLayout lr
            user -> platform.web "Start sign-up/sign-in"
            platform.web -> platform.api "Begin OIDC flow"
            platform.api -> oidc "Redirect to OIDC (authorization request)"
            user -> oidc "Authenticate (hosted UI)"
            oidc -> platform.api "Redirect (auth code)"
            platform.api -> oidc "Exchange code for tokens (server-side)"
            platform.api -> platform.web "Set httpOnly session cookie; redirect to app"
            platform.web -> platform.api "Onboarding: upsert profile"
            platform.api -> platform.flow "Delegate onboarding orchestration"
            platform.flow -> platform.metadata "Persist user + (optional) customer"
            platform.flow -> platform.eventbus "UserCreated | UserJoinedCustomer"
            platform.api -> platform.web "Onboarding complete"
        }

        dynamic platform "flow-2-album-and-image-ingestion" "Album & Image Ingestion (Nested, Free/Paid)" {
            autoLayout
            user -> platform.web "Create/arrange album"
            platform.web -> platform.api "Create album {visibility, access}"
            platform.api -> platform.flow "Create album (delegate)"
            platform.flow -> platform.albums "Create album"
            platform.albums -> platform.metadata "Persist album"

            user -> platform.web "Set monetization"
            platform.web -> platform.api "Attach priceListId (if paid)"
            platform.api -> platform.flow "Attach price list (delegate)"
            platform.flow -> platform.pricelists "Validate/attach"
            platform.pricelists -> platform.metadata "Persist"

            user -> platform.web "Upload images"
            platform.web -> platform.api "Register metadata, request upload URLs"
            platform.api -> platform.flow "Register image (delegate)"
            platform.flow -> platform.images "Register/prepare"
            platform.images -> platform.assets "Coordinate upload"
            platform.web -> platform.api "Confirm upload completed, mark uploaded"
            platform.api -> platform.flow "Mark uploaded (delegate)"
            platform.flow -> platform.images "Mark uploaded"
            platform.images -> platform.eventbus "ImageUploaded"
            platform.eventbus -> platform.analytics "Trigger downstream metrics"
        }

        dynamic platform "flow-3-visitor-access-and-authorization" "Visitor Access (Public/Hidden/Restricted)" {
            autoLayout
            visitor -> platform.web "Open album URL"
            platform.web -> platform.api "Request album"
            platform.api -> platform.flow "Fetch album (delegate)"
            platform.flow -> platform.albums "Fetch album"
            platform.albums -> platform.metadata "Read album"
            platform.flow -> platform.policy "Evaluate access"
            platform.policy -> platform.metadata "Read ACL/visibility"
            platform.flow -> platform.web "Allow or deny; if allow, return listing"

            visitor -> platform.web "View images"
            platform.web -> platform.api "Fetch image metadata"
            platform.api -> platform.flow "Fetch images (delegate)"
            platform.flow -> platform.images "Read images"
            platform.images -> platform.metadata "Read image metadata"

            platform.web -> platform.api "Record view event"
            platform.api -> platform.flow "Publish view event (delegate)"
            platform.flow -> platform.eventbus "Publish"
            platform.eventbus -> platform.analytics "Update counters"
            platform.analytics -> platform.stats "Increment views"
        }

        dynamic platform "flow-4-shopping-browse-to-order" "Shopping: Browse → Cart → Checkout → Order" {
            autoLayout
            visitor -> platform.web "Add image(s) to cart"
            platform.web -> platform.api "Upsert cart"
            platform.api -> platform.flow "Create/update cart (delegate)"
            platform.flow -> platform.carts "Create/update"
            platform.carts -> platform.metadata "Persist cart"

            platform.web -> platform.api "Price cart, quote totals"
            platform.api -> platform.flow "Price cart (delegate)"
            platform.flow -> platform.pricing "Compute totals"
            platform.pricing -> platform.pricelists "Read rules"
            platform.pricelists -> platform.metadata "Fetch price list"
            platform.flow -> platform.web "Totals"

            visitor -> platform.web "Checkout"
            platform.web -> platform.api "Create order from cart"
            platform.api -> platform.flow "Create order (delegate)"
            platform.flow -> platform.orders "Create order"
            platform.orders -> platform.metadata "Persist order"
            platform.orders -> payments "Create payment session"
            payments -> platform.orders "Webhook: payment_succeeded/failed"
            platform.flow -> platform.eventbus "OrderPaid | OrderFailed"
            platform.eventbus -> platform.analytics "Record conversion"
            platform.analytics -> platform.stats "Increment buys"

            platform.web -> platform.api "Return from payment (client-side redirect), load order status"
            platform.api -> platform.flow "Read order status (delegate)"
            platform.flow -> platform.orders "Read status"
            platform.flow -> platform.web "Receipt / download availability"
        }

        dynamic platform "flow-5-analytics-and-stats" "Analytics & Stats (Event-Driven + API reads)" {
            autoLayout
            platform.web -> platform.api "Record telemetry (view/download/cart/order)"
            platform.api -> platform.flow "Telemetry (delegate)"
            platform.flow -> platform.eventbus "Publish telemetry events"
            platform.eventbus -> platform.analytics "Consume"
            platform.analytics -> platform.stats "Upsert counters & rollups"

            platform.web -> platform.api "Fetch metrics"
            platform.api -> platform.flow "Metrics query (delegate)"
            platform.flow -> platform.stats "Query aggregates"
            platform.flow -> platform.web "Return metrics"
        }

        styles {
            // Base element styles
            element "Person" {
                background #08427b
                color #ffffff
                shape Person
            }
            element "Software System" {
                background #1168bd
                color #ffffff
            }
            element "Container" {
                background #438dd5
                color #ffffff
            }

            // Type-based tags
            element "UI" {
                background #e3f2fd
                color #0d47a1
                shape RoundedBox
            }

            element "API" {
                background #e8f5e9
                color #1b5e20
                shape RoundedBox
            }
            element "Service" {
                background #fff8e1
                color #e65100
                shape Box
            }
            element "Data Store" {
                background #fff3e0
                color #bf360c
                shape Cylinder
            }
            element "Event/Queue" {
                background #f3e5f5
                color #6a1b9a
                shape Pipe
            }
            element "Storage" {
                background #e0f7fa
                color #006064
                shape Folder
            }
            element "External" {
                background #eceff1
                color #37474f
                border dashed
            }


        }

    }
}
