"""Seed pre-built industry glossaries."""

ECOMMERCE_TERMS = [
    {"source_term": "Add to Cart", "target_term": "", "context": "Button to add item to shopping cart"},
    {"source_term": "Checkout", "target_term": "", "context": "Process to complete purchase"},
    {"source_term": "Shopping Cart", "target_term": "", "context": "Collection of items to purchase"},
    {"source_term": "Wishlist", "target_term": "", "context": "Saved items for later"},
    {"source_term": "Free Shipping", "target_term": "", "context": "No delivery charge"},
    {"source_term": "Return Policy", "target_term": "", "context": "Rules for returning items"},
    {"source_term": "Track Order", "target_term": "", "context": "Follow shipment status"},
    {"source_term": "Out of Stock", "target_term": "", "context": "Item not available"},
    {"source_term": "In Stock", "target_term": "", "context": "Item available for purchase"},
    {"source_term": "Size Guide", "target_term": "", "context": "Measurement reference"},
    {"source_term": "Customer Reviews", "target_term": "", "context": "User feedback on products"},
    {"source_term": "Best Seller", "target_term": "", "context": "Top selling item"},
    {"source_term": "New Arrival", "target_term": "", "context": "Recently added product"},
    {"source_term": "Sale", "target_term": "", "context": "Discounted price"},
    {"source_term": "Discount Code", "target_term": "", "context": "Promotional code for savings"},
    {"source_term": "Payment Method", "target_term": "", "context": "How to pay"},
    {"source_term": "Billing Address", "target_term": "", "context": "Payment address"},
    {"source_term": "Shipping Address", "target_term": "", "context": "Delivery address"},
    {"source_term": "Order Confirmation", "target_term": "", "context": "Purchase verification"},
    {"source_term": "Refund", "target_term": "", "context": "Money returned for return"},
]

ADTECH_TERMS = [
    {"source_term": "Impressions", "target_term": "", "context": "Number of times ad was displayed"},
    {"source_term": "Click-Through Rate (CTR)", "target_term": "", "context": "Clicks divided by impressions"},
    {"source_term": "Conversion", "target_term": "", "context": "Desired action completed"},
    {"source_term": "Cost Per Click (CPC)", "target_term": "", "context": "Price per ad click"},
    {"source_term": "Cost Per Mille (CPM)", "target_term": "", "context": "Cost per thousand impressions"},
    {"source_term": "Return on Ad Spend (ROAS)", "target_term": "", "context": "Revenue per ad dollar spent"},
    {"source_term": "Target Audience", "target_term": "", "context": "Intended ad recipients"},
    {"source_term": "Attribution", "target_term": "", "context": "Assigning credit to touchpoints"},
    {"source_term": "A/B Testing", "target_term": "", "context": "Comparing two variants"},
    {"source_term": "Landing Page", "target_term": "", "context": "Page after ad click"},
    {"source_term": "Call to Action (CTA)", "target_term": "", "context": "Prompt to take action"},
    {"source_term": "Bounce Rate", "target_term": "", "context": "Single-page visit rate"},
    {"source_term": "Engagement Rate", "target_term": "", "context": "User interaction metric"},
    {"source_term": "Reach", "target_term": "", "context": "Unique users exposed to ad"},
    {"source_term": "Frequency", "target_term": "", "context": "Times ad shown per user"},
    {"source_term": "Retargeting", "target_term": "", "context": "Ads to previous visitors"},
    {"source_term": "Lookalike Audience", "target_term": "", "context": "Similar user targeting"},
    {"source_term": "Ad Placement", "target_term": "", "context": "Where ad appears"},
    {"source_term": "Campaign", "target_term": "", "context": "Marketing initiative"},
    {"source_term": "Ad Creative", "target_term": "", "context": "Visual/text ad content"},
]

WELLNESS_TERMS = [
    {"source_term": "Dietary Supplement", "target_term": "", "context": "Nutritional product"},
    {"source_term": "Serving Size", "target_term": "", "context": "Recommended portion"},
    {"source_term": "Daily Value", "target_term": "", "context": "Percentage of daily needs"},
    {"source_term": "Active Ingredient", "target_term": "", "context": "Primary effective component"},
    {"source_term": "Natural", "target_term": "", "context": "From natural sources"},
    {"source_term": "Organic", "target_term": "", "context": "Certified organic product"},
    {"source_term": "Gluten-Free", "target_term": "", "context": "Contains no gluten"},
    {"source_term": "Non-GMO", "target_term": "", "context": "No genetic modification"},
    {"source_term": "Vegan", "target_term": "", "context": "No animal products"},
    {"source_term": "Disclaimer", "target_term": "", "context": "Legal notice about claims"},
    {"source_term": "Consult your doctor", "target_term": "", "context": "Medical advice notice"},
    {"source_term": "Side Effects", "target_term": "", "context": "Possible adverse reactions"},
    {"source_term": "Dosage", "target_term": "", "context": "Amount to take"},
    {"source_term": "Wellness", "target_term": "", "context": "Overall health state"},
    {"source_term": "Immune Support", "target_term": "", "context": "Immunity benefits"},
    {"source_term": "Energy Boost", "target_term": "", "context": "Increased vitality"},
    {"source_term": "Sleep Support", "target_term": "", "context": "Better sleep aid"},
    {"source_term": "Stress Relief", "target_term": "", "context": "Anxiety reduction"},
    {"source_term": "Digestive Health", "target_term": "", "context": "Gut wellness"},
    {"source_term": "Results may vary", "target_term": "", "context": "Individual outcome disclaimer"},
]


SYSTEM_GLOSSARIES = [
    {
        "name": "E-commerce Standard Terms",
        "description": "Common terminology for online retail and shopping websites",
        "industry": "ecommerce",
        "source_language": "en",
        "target_language": "ko",
        "terms": ECOMMERCE_TERMS
    },
    {
        "name": "Ad Tech Standard Terms",
        "description": "Digital advertising and marketing terminology",
        "industry": "adtech",
        "source_language": "en",
        "target_language": "ko",
        "terms": ADTECH_TERMS
    },
    {
        "name": "Wellness & Health Standard Terms",
        "description": "Health, wellness, and supplement industry terminology",
        "industry": "wellness",
        "source_language": "en",
        "target_language": "ko",
        "terms": WELLNESS_TERMS
    },
]


async def seed_system_glossaries(db):
    """Seed system glossaries if they don't exist."""
    from sqlalchemy import select
    from app.models.glossary import Glossary, GlossaryTerm

    for glossary_data in SYSTEM_GLOSSARIES:
        # Check if already exists
        result = await db.execute(
            select(Glossary).where(
                Glossary.name == glossary_data["name"],
                Glossary.is_system == True
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            continue

        # Create glossary
        glossary = Glossary(
            user_id=None,
            name=glossary_data["name"],
            description=glossary_data["description"],
            industry=glossary_data["industry"],
            source_language=glossary_data["source_language"],
            target_language=glossary_data["target_language"],
            is_system=True
        )
        db.add(glossary)
        await db.flush()

        # Add terms
        for term_data in glossary_data["terms"]:
            term = GlossaryTerm(
                glossary_id=glossary.id,
                source_term=term_data["source_term"],
                target_term=term_data["target_term"],
                context=term_data["context"],
                notes=term_data.get("notes")
            )
            db.add(term)

    await db.commit()
