"use client";

import { useEffectiveMount } from "@/hooks/useMountParam";
import Iris from "@/components/Iris";
import { IRIS_HERO } from "@/config/iris-config";

export default function HeroIris() {
  const mount = useEffectiveMount();
  return <Iris config={IRIS_HERO} uid="hero" key={mount} />;
}
