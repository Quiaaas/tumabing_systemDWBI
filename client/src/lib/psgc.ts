export type PsgcPlace = {
  code: string;
  name: string;
  regionName?: string;
};

const PSGC_API = "https://psgc.gitlab.io/api";

async function getPlaces(path: string): Promise<PsgcPlace[]> {
  const response = await fetch(`${PSGC_API}/${path}`);
  if (!response.ok) throw new Error("PSGC geographic data could not be loaded.");
  return (await response.json()) as PsgcPlace[];
}

export function getRegions() {
  return getPlaces("regions.json");
}

export function getProvinces(regionCode: string) {
  return getPlaces(`regions/${encodeURIComponent(regionCode)}/provinces.json`);
}

export function getCitiesMunicipalities(provinceCode: string) {
  return getPlaces(`provinces/${encodeURIComponent(provinceCode)}/cities-municipalities.json`);
}

export function getBarangays(cityMunicipalityCode: string) {
  return getPlaces(`cities-municipalities/${encodeURIComponent(cityMunicipalityCode)}/barangays.json`);
}

export function calculateAge(birthDate: string, today = new Date()) {
  if (!birthDate) return null;
  const [year, month, day] = birthDate.split("-").map(Number);
  if (!year || !month || !day) return null;
  let age = today.getFullYear() - year;
  const birthdayHasPassed = today.getMonth() + 1 > month || (today.getMonth() + 1 === month && today.getDate() >= day);
  if (!birthdayHasPassed) age -= 1;
  return age >= 0 ? age : null;
}
