#ifndef _PACKET_REPLY_INFO_HPP_
#define _PACKET_REPLY_INFO_HPP_

#include <stack>

#include "flit.hpp"

//register the requests to a node
class PacketReplyInfo {

public:
  int source;
  int time;
  bool record;
  Flit::FlitType type;

  static PacketReplyInfo* New();
  void Free();
  static void FreeAll();

private:

  static stack<PacketReplyInfo*> _all;
  static stack<PacketReplyInfo*> _free;

  PacketReplyInfo() {}
  ~PacketReplyInfo() {}
};

#endif
