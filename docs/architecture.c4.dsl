workspace "Image Sharing & Selling Platform" "Vision/Feature Level with BFF" {

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

            web = container "Web App" "Browser UI. Initiates auth via BFF; receives only httpOnly session cookies." "TypeScript/React" {
                tags "UI"
            }

            bff = container "BFF API" "Frontend-facing API: session management, OIDC handshake, aggregation." "TypeScript (Node.js)" {
                tags "BFF"
            }

            api = container "Domain API" "Domain orchestration and business logic." "TypeScript (Node.js)" {
                tags "API"
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

            // Core call graph (BFF pattern)
            user -> web "Uses"
            visitor -> web "Uses"
            admin -> web "Uses"
            web -> bff "All UI calls; no tokens in browser"
            bff -> web "Redirects/callbacks; sets httpOnly session cookie"

            // Authentication through BFF
            user -> oidc "Authenticates via redirect (UI)"
            admin -> oidc "Authenticates via redirect (UI)"
            owner -> oidc "Authenticates via redirect (UI)"
            bff -> oidc "Start auth / token exchange (back channel)"
            oidc -> bff "Auth code / tokens (back channel)"

            // BFF to domain
            bff -> api "Invoke domain operations"
            bff -> stats "Query metrics for UI"

            // Domain to services
            api -> albums "Manage albums"
            api -> images "Manage images / uploads"
            api -> pricelists "Manage price lists"
            api -> pricing "Quote totals"
            api -> carts "Create/update cart"
            api -> orders "Create/advance order"
            api -> policy "Check access to albums/images"
            api -> eventbus "Emit domain events"
            api -> metadata "Read/write data"

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

        dynamic platform "flow-1-signup-and-customer-association" "User Sign-Up via BFF (No tokens in Web App)" {
            autoLayout lr
            user -> platform.web "Start sign-up/sign-in"
            platform.web -> platform.bff "Begin OIDC flow"
            platform.bff -> oidc "Redirect to OIDC (authorization request)"
            user -> oidc "Authenticate (hosted UI)"
            oidc -> platform.bff "Redirect (auth code)"
            platform.bff -> oidc "Exchange code for tokens (server-side)"
            platform.bff -> platform.web "Set httpOnly session cookie; redirect to app"
            platform.web -> platform.bff "Onboarding: upsert profile"
            platform.bff -> platform.api "Upsert user profile / customer"
            platform.api -> platform.metadata "Persist user + (optional) customer"
            platform.api -> platform.eventbus "UserCreated | UserJoinedCustomer"
            platform.bff -> platform.web "Onboarding complete"
        }

        dynamic platform "flow-2-album-and-image-ingestion" "Album & Image Ingestion (Nested, Free/Paid)" {
            autoLayout
            user -> platform.web "Create/arrange album"
            platform.web -> platform.bff "Create album {visibility, access}"
            platform.bff -> platform.api "Create album"
            platform.api -> platform.albums "Create album"
            platform.albums -> platform.metadata "Persist album"

            user -> platform.web "Set monetization"
            platform.web -> platform.bff "Attach priceListId (if paid)"
            platform.bff -> platform.api "Validate/attach price list"
            platform.api -> platform.pricelists "Validate/attach"
            platform.pricelists -> platform.metadata "Persist"

            user -> platform.web "Upload images"
            platform.web -> platform.bff "Register image(s)"
            platform.bff -> platform.api "Register metadata, request upload URLs"
            platform.api -> platform.images "Register/prepare"
            platform.images -> platform.assets "Coordinate upload"
            platform.web -> platform.bff "Confirm upload completed"
            platform.bff -> platform.api "Mark uploaded"
            platform.api -> platform.images "Mark uploaded"
            platform.images -> platform.eventbus "ImageUploaded"
            platform.eventbus -> platform.analytics "Trigger downstream metrics"
        }

        dynamic platform "flow-3-visitor-access-and-authorization" "Visitor Access (Public/Hidden/Restricted via BFF)" {
            autoLayout
            visitor -> platform.web "Open album URL"
            platform.web -> platform.bff "Request album"
            platform.bff -> platform.api "Resolve album"
            platform.api -> platform.albums "Fetch album"
            platform.albums -> platform.metadata "Read album"
            platform.api -> platform.policy "Evaluate access"
            platform.policy -> platform.metadata "Read ACL/visibility"
            platform.bff -> platform.web "Allow or deny; if allow, return listing"

            visitor -> platform.web "View images"
            platform.web -> platform.bff "Fetch image metadata"
            platform.bff -> platform.api "Get images"
            platform.api -> platform.images "Read images"
            platform.images -> platform.metadata "Read image metadata"

            platform.web -> platform.bff "Record view event"
            platform.bff -> platform.api "Emit view event"
            platform.api -> platform.eventbus "Publish"
            platform.eventbus -> platform.analytics "Update counters"
            platform.analytics -> platform.stats "Increment views"
        }

        dynamic platform "flow-4-shopping-browse-to-order" "Shopping: Browse → Cart → Checkout → Order (via BFF)" {
            autoLayout
            visitor -> platform.web "Add image(s) to cart"
            platform.web -> platform.bff "Upsert cart"
            platform.bff -> platform.api "Create/update cart"
            platform.api -> platform.carts "Create/update"
            platform.carts -> platform.metadata "Persist cart"

            platform.web -> platform.bff "Price cart"
            platform.bff -> platform.api "Quote totals"
            platform.api -> platform.pricing "Compute totals"
            platform.pricing -> platform.pricelists "Read rules"
            platform.pricelists -> platform.metadata "Fetch price list"
            platform.bff -> platform.web "Totals"

            visitor -> platform.web "Checkout"
            platform.web -> platform.bff "Create order from cart"
            platform.bff -> platform.api "Create order"
            platform.api -> platform.orders "Create order"
            platform.orders -> platform.metadata "Persist order"
            platform.orders -> payments "Create payment session"
            payments -> platform.orders "Webhook: payment_succeeded/failed"
            platform.api -> platform.eventbus "OrderPaid | OrderFailed"
            platform.eventbus -> platform.analytics "Record conversion"
            platform.analytics -> platform.stats "Increment buys"

            platform.web -> platform.bff "Return from payment (client-side redirect)"
            platform.bff -> platform.api "Load order status"
            platform.api -> platform.orders "Read status"
            platform.bff -> platform.web "Receipt / download availability"
        }

        dynamic platform "flow-5-analytics-and-stats" "Analytics & Stats (Event-Driven + BFF Reads)" {
            autoLayout
            platform.web -> platform.bff "Record telemetry (view/download/cart/order)"
            platform.bff -> platform.api "Forward telemetry"
            platform.api -> platform.eventbus "Publish telemetry events"
            platform.eventbus -> platform.analytics "Consume"
            platform.analytics -> platform.stats "Upsert counters & rollups"

            platform.web -> platform.bff "Fetch metrics"
            platform.bff -> platform.stats "Query aggregates"
            platform.bff -> platform.web "Return metrics"
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
            element "BFF" {
                background #ede7f6
                color #4a148c
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
