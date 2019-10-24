# -*- coding: utf-8 -*-
# Generated by the protocol buffer compiler.  DO NOT EDIT!
# source: testprotocol.proto

import sys
_b=sys.version_info[0]<3 and (lambda x:x) or (lambda x:x.encode('latin1'))
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from google.protobuf import reflection as _reflection
from google.protobuf import symbol_database as _symbol_database
# @@protoc_insertion_point(imports)

_sym_db = _symbol_database.Default()




DESCRIPTOR = _descriptor.FileDescriptor(
  name='testprotocol.proto',
  package='testi',
  syntax='proto2',
  serialized_options=None,
  serialized_pb=_b('\n\x12testprotocol.proto\x12\x05testi\"@\n\x0b\x43hatmessage\x12\x10\n\x08senderID\x18\x01 \x02(\x05\x12\x12\n\nsenderName\x18\x02 \x02(\t\x12\x0b\n\x03msg\x18\x03 \x02(\t\"3\n\x0c\x43hatmessages\x12#\n\x07\x63hatmsg\x18\x01 \x03(\x0b\x32\x12.testi.Chatmessage')
)




_CHATMESSAGE = _descriptor.Descriptor(
  name='Chatmessage',
  full_name='testi.Chatmessage',
  filename=None,
  file=DESCRIPTOR,
  containing_type=None,
  fields=[
    _descriptor.FieldDescriptor(
      name='senderID', full_name='testi.Chatmessage.senderID', index=0,
      number=1, type=5, cpp_type=1, label=2,
      has_default_value=False, default_value=0,
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      serialized_options=None, file=DESCRIPTOR),
    _descriptor.FieldDescriptor(
      name='senderName', full_name='testi.Chatmessage.senderName', index=1,
      number=2, type=9, cpp_type=9, label=2,
      has_default_value=False, default_value=_b("").decode('utf-8'),
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      serialized_options=None, file=DESCRIPTOR),
    _descriptor.FieldDescriptor(
      name='msg', full_name='testi.Chatmessage.msg', index=2,
      number=3, type=9, cpp_type=9, label=2,
      has_default_value=False, default_value=_b("").decode('utf-8'),
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      serialized_options=None, file=DESCRIPTOR),
  ],
  extensions=[
  ],
  nested_types=[],
  enum_types=[
  ],
  serialized_options=None,
  is_extendable=False,
  syntax='proto2',
  extension_ranges=[],
  oneofs=[
  ],
  serialized_start=29,
  serialized_end=93,
)


_CHATMESSAGES = _descriptor.Descriptor(
  name='Chatmessages',
  full_name='testi.Chatmessages',
  filename=None,
  file=DESCRIPTOR,
  containing_type=None,
  fields=[
    _descriptor.FieldDescriptor(
      name='chatmsg', full_name='testi.Chatmessages.chatmsg', index=0,
      number=1, type=11, cpp_type=10, label=3,
      has_default_value=False, default_value=[],
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      serialized_options=None, file=DESCRIPTOR),
  ],
  extensions=[
  ],
  nested_types=[],
  enum_types=[
  ],
  serialized_options=None,
  is_extendable=False,
  syntax='proto2',
  extension_ranges=[],
  oneofs=[
  ],
  serialized_start=95,
  serialized_end=146,
)

_CHATMESSAGES.fields_by_name['chatmsg'].message_type = _CHATMESSAGE
DESCRIPTOR.message_types_by_name['Chatmessage'] = _CHATMESSAGE
DESCRIPTOR.message_types_by_name['Chatmessages'] = _CHATMESSAGES
_sym_db.RegisterFileDescriptor(DESCRIPTOR)

Chatmessage = _reflection.GeneratedProtocolMessageType('Chatmessage', (_message.Message,), {
  'DESCRIPTOR' : _CHATMESSAGE,
  '__module__' : 'testprotocol_pb2'
  # @@protoc_insertion_point(class_scope:testi.Chatmessage)
  })
_sym_db.RegisterMessage(Chatmessage)

Chatmessages = _reflection.GeneratedProtocolMessageType('Chatmessages', (_message.Message,), {
  'DESCRIPTOR' : _CHATMESSAGES,
  '__module__' : 'testprotocol_pb2'
  # @@protoc_insertion_point(class_scope:testi.Chatmessages)
  })
_sym_db.RegisterMessage(Chatmessages)


# @@protoc_insertion_point(module_scope)
