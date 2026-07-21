#include "packet_reply_info.hpp"

stack<PacketReplyInfo*> PacketReplyInfo::_all;
stack<PacketReplyInfo*> PacketReplyInfo::_free;

PacketReplyInfo * PacketReplyInfo::New()
{
  PacketReplyInfo * pr;
  if(_free.empty()) {
    pr = new PacketReplyInfo();
    _all.push(pr);
  } else {
    pr = _free.top();
    _free.pop();
  }
  return pr;
}

void PacketReplyInfo::Free()
{
  _free.push(this);
}

void PacketReplyInfo::FreeAll()
{
  while(!_all.empty()) {
    delete _all.top();
    _all.pop();
  }
}
