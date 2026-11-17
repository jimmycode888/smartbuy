# Catalog expansion: executed browser checks, 2026-11-17

- Edge local static demo: headphone catalogue showed16 cards and mouse catalogue12.
- All six new headphone and four new mouse product pictures loaded. Pictures also decoded successfully with Pillow; JPEG and PNG formats retained without modifying product appearance.
- HKD700 / commuting / headband / requireANC / preferJBL / minimum40h returned Tune780NC. Requirement summary retained all fields and brand editor listedSony,Xiaomi,JBL,Shokz.
- Mouse HKD100 / office / Bluetooth / mandatorysilent returned Wireless Mouse3 atHKD99.
- Expanded source details displayed Xiaomi weight as unknown with57g-excluding-battery explanation and full dated price/specification links.
- Switching English preserved state and translated the added evidence/weight notes.
- Added maxweight80g: no matches; the unknown ready-to-use weight was excluded rather than assuming the57g bare-device figure met the limit.
- Switched categories and checked both Shokz images and retained headphone requirement state.
- Automated test rerun52/52pass; original expansion attempt37pass/10fail recorded separately. Changed expectations concern new catalogue counts, sorting, lower qualifying price and PNG/JPEG file formats. Core constraint assertions remain.
- No realDeepSeek request executed.
