from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Tuple


@dataclass
class LatLng:
    lat: float
    lng: float


@dataclass
class RouteResult:
    distance_meters: int
    duration_seconds: int
    polyline: str


@dataclass
class GeocodedAddress:
    formatted_address: str
    lat: float
    lng: float
    place_id: str


class MapsProvider(ABC):
    @abstractmethod
    async def geocode(self, address: str) -> GeocodedAddress:
        ...

    @abstractmethod
    async def reverse_geocode(self, lat: float, lng: float) -> GeocodedAddress:
        ...

    @abstractmethod
    async def get_route(self, origin: LatLng, destination: LatLng) -> RouteResult:
        ...

    @abstractmethod
    async def distance_matrix(
        self, origins: List[LatLng], destinations: List[LatLng]
    ) -> List[List[RouteResult]]:
        ...

    @abstractmethod
    async def place_autocomplete(self, query: str, location: LatLng | None = None) -> List[dict]:
        ...
