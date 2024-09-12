declare module 'topojson-client' {
    import { GeometryCollection, FeatureCollection } from 'geojson';
  
    export function feature<
      P = { [key: string]: any },
      G = GeometryCollection
    >(
      topology: any,
      object: any
    ): FeatureCollection<G, P>;
  }
  