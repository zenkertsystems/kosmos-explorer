# Astronomische Katalogdaten

## `gaia-dr3-cepheids.csv`

Kuratierter WebGL-Datensatz aus Gaia DR3 mit 1.000 klassischen Cepheiden.

- Quelle: Gaia DR3, Tabellen `gaiadr3.vari_cepheid` und `gaiadr3.gaia_source`
- Zugriff: öffentlicher Gaia-TAP-Spiegel des Astronomischen Rechen-Instituts Heidelberg
- Gaia-Originaldaten: https://cdn.gea.esac.esa.int/Gaia/gdr3/Variability/vari_cepheid/
- Abrufdatum: 2026-08-12
- Auswahl: `DCEP`, vorhandene Grundperiode, positive Parallaxe und `parallax_over_error > 5`
- Jede Zeile besitzt eine eindeutige Gaia-DR3-`source_id`.

Enthalten sind Himmels- und galaktische Koordinaten, Parallaxe, Parallaxenfehler,
photometrische Distanz (soweit vorhanden), G-Helligkeit, Farbe, Pulsationsperiode,
Amplitude, Metallizität und Gaia-Klassifikation.

Für Quellen ohne `distance_gspphot` kann die Visualisierung bei diesem gefilterten
Datensatz als transparente Näherung `1000 / parallax` Parsec verwenden. Das ist
keine vollständige probabilistische Distanzschätzung.

Verwendete ADQL-Abfrage:

```sql
select
  c.source_id, g.ra, g.dec, g.l, g.b,
  g.parallax, g.parallax_error, g.parallax_over_error,
  g.distance_gspphot, g.phot_g_mean_mag, g.bp_rp,
  c.pf, c.pf_error, c.p1_o,
  c.int_average_g, c.int_average_bp, c.int_average_rp,
  c.peak_to_peak_g, c.metallicity,
  c.type_best_classification, c.mode_best_classification
from gaiadr3.vari_cepheid c
join gaiadr3.gaia_source g on c.source_id = g.source_id
where c.type_best_classification = 'DCEP'
  and c.pf is not null
  and g.parallax > 0
  and g.parallax_over_error > 5
```

Gaia-Daten müssen gemäß den Gaia-Credit- und Zitierhinweisen attribuiert werden:
https://gea.esac.esa.int/archive/documentation/credits.html
