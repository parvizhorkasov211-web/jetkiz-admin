# Admin courier map production settings

Required/recommended environment for the production admin deployment:

```text
NEXT_PUBLIC_COURIER_MAP_TILE_URL=https://your-tile-provider/{z}/{x}/{y}.png
NEXT_PUBLIC_COURIER_MAP_TILE_ATTRIBUTION=Map data attribution required by provider
```

The application keeps the public OpenStreetMap tile URL only as a development/fallback option. Production should use a tile provider with an explicit quota/SLA suitable for the expected operator traffic.

The backend must separately define `WS_CORS_ORIGINS` even though the current admin map snapshot is HTTP-polled; other tracking clients use the authenticated tracking gateway.

Operational map permissions:

- `couriers.location_read`: exact courier GPS/map access;
- `orders.pii_read`: client delivery address in the courier map;
- without the PII permission the order remains visible but the client address is omitted.
