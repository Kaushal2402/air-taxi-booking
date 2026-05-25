from __future__ import annotations
from typing import List

import httpx

from app.config import get_settings
from app.providers.base.maps import GeocodedAddress, LatLng, MapsProvider, RouteResult

settings = get_settings()

GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"
DIRECTIONS_URL = "https://maps.googleapis.com/maps/api/directions/json"
DISTANCE_MATRIX_URL = "https://maps.googleapis.com/maps/api/distancematrix/json"
PLACES_AUTOCOMPLETE_URL = "https://maps.googleapis.com/maps/api/place/autocomplete/json"


class GoogleMapsAdapter(MapsProvider):
    def __init__(self, api_key: str | None = None):
        self._key = api_key or settings.GOOGLE_MAPS_API_KEY

    async def geocode(self, address: str) -> GeocodedAddress:
        async with httpx.AsyncClient() as client:
            r = await client.get(GEOCODE_URL, params={"address": address, "key": self._key})
            r.raise_for_status()
            result = r.json()["results"][0]
            loc = result["geometry"]["location"]
            return GeocodedAddress(
                formatted_address=result["formatted_address"],
                lat=loc["lat"],
                lng=loc["lng"],
                place_id=result["place_id"],
            )

    async def reverse_geocode(self, lat: float, lng: float) -> GeocodedAddress:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                GEOCODE_URL, params={"latlng": f"{lat},{lng}", "key": self._key}
            )
            r.raise_for_status()
            result = r.json()["results"][0]
            loc = result["geometry"]["location"]
            return GeocodedAddress(
                formatted_address=result["formatted_address"],
                lat=loc["lat"],
                lng=loc["lng"],
                place_id=result["place_id"],
            )

    async def get_route(self, origin: LatLng, destination: LatLng) -> RouteResult:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                DIRECTIONS_URL,
                params={
                    "origin": f"{origin.lat},{origin.lng}",
                    "destination": f"{destination.lat},{destination.lng}",
                    "key": self._key,
                },
            )
            r.raise_for_status()
            leg = r.json()["routes"][0]["legs"][0]
            return RouteResult(
                distance_meters=leg["distance"]["value"],
                duration_seconds=leg["duration"]["value"],
                polyline=r.json()["routes"][0]["overview_polyline"]["points"],
            )

    async def distance_matrix(
        self, origins: List[LatLng], destinations: List[LatLng]
    ) -> List[List[RouteResult]]:
        origins_str = "|".join(f"{o.lat},{o.lng}" for o in origins)
        destinations_str = "|".join(f"{d.lat},{d.lng}" for d in destinations)
        async with httpx.AsyncClient() as client:
            r = await client.get(
                DISTANCE_MATRIX_URL,
                params={"origins": origins_str, "destinations": destinations_str, "key": self._key},
            )
            r.raise_for_status()
            rows = r.json()["rows"]
            return [
                [
                    RouteResult(
                        distance_meters=cell["distance"]["value"],
                        duration_seconds=cell["duration"]["value"],
                        polyline="",
                    )
                    for cell in row["elements"]
                ]
                for row in rows
            ]

    async def place_autocomplete(self, query: str, location: LatLng | None = None) -> List[dict]:
        params: dict = {"input": query, "key": self._key}
        if location:
            params["location"] = f"{location.lat},{location.lng}"
        async with httpx.AsyncClient() as client:
            r = await client.get(PLACES_AUTOCOMPLETE_URL, params=params)
            r.raise_for_status()
            return r.json().get("predictions", [])
