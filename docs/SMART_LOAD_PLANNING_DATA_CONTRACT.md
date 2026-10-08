# Smart Load Planning — Data Contract
Units: centimetres and kilograms. Coordinates: x=length, y=width, z=height.
CargoLine: id,name,qty,l,w,h,kg,stackable,rotate,stop,orderId?,maxTopKg?.
VehicleSpace: id,name,l,w,h,maxKg,truckId?.
Placement: id,lineId,name,x,y,z,l,w,h,kg,stop,stackable,maxTopKg.
PackingResult: placed[],unplaced[],volumePct,weightPct,loadedKg,totalKg,cargoCount,warnings[].
Shared collection db.loadPlans[]: id,planNo,name,orderIds[],vehicle,lines[],placed[],unplaced[],stats,status,createdAt,updatedAt,engine.
Stage-1 statuses: Draft, Approved, Loading Confirmed.
Order owns business cargo and customer; Fleet owns truck identity; plan owns packing geometry and status. No automatic LR/DC creation or dispatch gating in Stage 1.
