#ifndef _ROUTEFUNC_HPP_
#define _ROUTEFUNC_HPP_

#include "flit.hpp"
#include "router.hpp"
#include "outputset.hpp"
#include "config_utils.hpp"

typedef void (*tRoutingFunction)( const Router *, const Flit *, int in_channel, OutputSet *, bool );

void InitializeRoutingMap( const Configuration & config );

extern map<string, tRoutingFunction> gRoutingFunctionMap;

extern int gNumVCs;
extern int gReadReqBeginVC, gReadReqEndVC;
extern int gWriteReqBeginVC, gWriteReqEndVC;
extern int gReadReplyBeginVC, gReadReplyEndVC;
extern int gWriteReplyBeginVC, gWriteReplyEndVC;

#endif
